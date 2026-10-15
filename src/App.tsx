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

const STORAGE_KEY = 'mcm_cam005_students_v3';
const LESSONS_STORAGE_KEY = 'mcm_cam005_lessons_v2';
const AUTH_SESSION_KEY = 'mcm_cam005_auth_session_v1';

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
      } else if (remoteStudents.length === 0) {
        await upsertStudentsToSupabase(students);
        setDbSyncStatus('SYNCED');
      } else {
        const enriched = remoteStudents.map(rs => {
          const fallback = INITIAL_STUDENTS.find(i => i.id === rs.id);
          return {
            ...rs,
            email: rs.email || fallback?.email || '',
            accessCode:
              rs.accessCode ||
              fallback?.accessCode ||
              `${rs.name.split(' ')[0].toUpperCase()}-01`
          };
        });
        setStudents(enriched);
        setDbSyncStatus('SYNCED');
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
    { id: 'CADENCE' as const, label: 'Daily Studio', shortLabel: 'Studio', sub: '10-Min Cadence', icon: Video, role: 'STUDENT' as const },
    { id: 'WORKBOOK' as const, label: 'Lessons 1–26', shortLabel: 'Lessons', sub: 'Self-Paced Workbook', icon: BookOpen, role: 'STUDENT' as const },
    { id: 'MAGNETS' as const, label: 'Shift Magnets', shortLabel: 'Magnets', sub: 'Lead Magnets & DMs', icon: Magnet, role: 'STUDENT' as const },
    { id: 'COACH' as const, label: 'Coach & Admin', shortLabel: 'Admin', sub: 'Student Setup & Cohort', icon: UserCheck, role: 'COACH' as const }
  ];

  const navItems = isAdminSession
    ? allNavItems
    : allNavItems.filter(item => item.role === 'STUDENT');

  const completedSupportingCount = currentStudent.supportingVideos.filter(v => v.status === 'Completed').length;

  return (
    <div className="min-h-dvh flex bg-[#090A0F] text-slate-100">
      {/* Live Push Notification Toast Stack */}
      {pushBanners.length > 0 && (
        <div className="fixed bottom-20 md:bottom-5 right-3.5 md:right-5 z-50 w-[92vw] max-w-sm space-y-2.5">
          {pushBanners.map(b => (
            <div
              key={b.id}
              className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 ${
                b.type === 'MISSED_ALERT'
                  ? 'border-rose-500/40 bg-[#1B1016]/95 text-white'
                  : b.type === 'COACH_NUDGE'
                  ? 'border-sky-500/40 bg-[#0F1826]/95 text-white'
                  : 'border-emerald-500/40 bg-[#0E1B18]/95 text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                    Push Notification
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">{b.title}</div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{b.body}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPushBanners(prev => prev.filter(x => x.id !== b.id))}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sleek Left Navigation Rail (Desktop) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between border-r border-white/8 bg-[#0C0E16] p-5 sticky top-0 h-dvh">
        <div className="space-y-7">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-lg shadow-sky-500/20">
              MC
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-none">
                Market Concussion
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {isAdminSession ? 'Admin & Coach Portal' : 'Student Portal'}
              </div>
            </div>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="space-y-1.5">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {isAdminSession ? 'Admin & Student Views' : 'Student Workspace'}
            </div>
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
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-sky-500/15 text-white border border-sky-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-sky-400 text-slate-950' : 'bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-none">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Student 7-Hour Machine Summary Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">7-Hour Goal</span>
              <span className="text-sky-400 font-semibold">
                {currentStudent.minutesAvailableCurrent}m / 420m
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
                style={{ width: `${Math.min(100, (currentStudent.minutesAvailableCurrent / 420) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 font-medium">Concussion Content</span>
              <span className="text-emerald-400 font-semibold">
                {completedSupportingCount} / {currentStudent.supportingVideos.length}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{
                  width: `${(completedSupportingCount / Math.max(1, currentStudent.supportingVideos.length)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Active Profile Switcher (Admin Only) + Logout */}
        <div className="pt-4 border-t border-white/8 space-y-2.5">
          {isAdminSession ? (
            <>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1">
                Active Student View (Admin)
              </label>
              <select
                value={activeStudentId}
                onChange={e => setActiveStudentId(e.target.value)}
                aria-label="Select active student profile"
                className="w-full rounded-xl bg-[#141722] border border-white/10 text-xs font-medium text-white px-3 py-2.5 focus:outline-none focus:border-sky-400"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name.split(' ')[0]} · Lesson {s.currentWeek}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="px-2 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400">
              Logged in as <span className="text-white font-semibold">{currentStudent.name}</span>
              {currentStudent.accessCode && (
                <span className="block text-[10px] text-sky-400 font-mono mt-0.5">
                  Access Code: {currentStudent.accessCode}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-xs font-medium text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Portal</span>
          </button>
        </div>
      </aside>

      {/* Right Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Preview Banner when viewing Student Tabs */}
        {isAdminSession && activeTab !== 'COACH' && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-3.5 sm:px-8 py-2 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-200 min-w-0 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong className="hidden sm:inline">Admin Preview:</strong> Viewing{' '}
                <span className="underline font-semibold">{currentStudent.name.split(' ')[0]}</span>
              </span>
            </div>
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
              className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-[11px] hover:bg-amber-300 transition-colors cursor-pointer shrink-0"
            >
              ← Admin
            </button>
          </div>
        )}

        {/* Clean Single-Row Top Header */}
        <header className="border-b border-white/8 bg-[#090A0F]/85 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-3.5 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold text-xs flex items-center justify-center shrink-0">
                {currentStudent.avatar}
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{currentStudent.name}</span>
                  <span
                    className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      isAdminSession
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {isAdminSession ? 'Admin Mode' : 'Student Portal'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Lesson {currentStudent.currentWeek}/26 · {currentStudent.minutesAvailableCurrent}m/420m
                </div>
              </div>
            </div>

            {/* Right Action Pills (Compact on Mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span
                className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold ${
                  dbSyncStatus === 'SYNCED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/[0.04] border-white/10 text-slate-400'
                }`}
                title="Live Supabase PostgreSQL Database Status"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    dbSyncStatus === 'SYNCED' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>{dbSyncStatus === 'SYNCED' ? 'Supabase DB Live' : 'Local Cache'}</span>
              </span>

              {isAdminSession && (
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/student?student=${currentStudent.id}`;
                    navigator.clipboard?.writeText(url);
                    triggerWebPushAndBanner(
                      'Student Direct Link Copied!',
                      `Share ${url} with ${currentStudent.name.split(' ')[0]} so they open directly into their synced Student Dashboard.`,
                      'DAILY_LESSON'
                    );
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-xs font-medium text-sky-300 transition-colors cursor-pointer"
                  title="Copy Direct Student Portal Link"
                >
                  <span>Copy Student Link</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowStudentInboxModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Coach Inbox</span>
                <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                  {currentStudent.messages.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (notificationPermission !== 'granted') {
                    enablePushNotifications();
                  } else {
                    const nextVid =
                      currentStudent.supportingVideos.find(v => v.status !== 'Completed') ||
                      currentStudent.supportingVideos[0];
                    triggerWebPushAndBanner(
                      `Daily Lesson & Video Ready (<10 Mins)`,
                      `Today's Concussion Content Video: Day #${nextVid.dayNumber} — "${nextVid.title}". Shoot & paste your social link!`,
                      'DAILY_LESSON'
                    );
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-xs font-medium text-amber-300 transition-colors cursor-pointer"
                title="Test Daily Push Notification"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Test Push</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="md:hidden flex items-center justify-center p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 cursor-pointer"
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
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0B0D15]/95 backdrop-blur-xl border-t border-white/10 px-2 pt-1.5 pb-safe">
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
                      ? 'text-sky-400 bg-sky-500/12 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
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
          <p className="text-slate-300 leading-relaxed">
            Upload a student’s strategy spreadsheet (such as{' '}
            <code className="text-sky-400">josh_content_tracking-v2.xlsx</code>) to automatically populate:
          </p>
          <ul className="space-y-1.5 text-slate-300 list-disc pl-5">
            <li>
              <strong>Content Playbook:</strong> 15 Core Pillars, Old/New Beliefs, Must-Hit Beats, and 4 Teaching Angles.
            </li>
            <li>
              <strong>Concussion Content:</strong> 50 Daily Micro-Topics with Hooks 1, 2, and 3.
            </li>
          </ul>

          <label className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-500/40 hover:border-sky-400 bg-[#0B0D14] p-8 cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-sky-400 mb-2" />
            <span className="text-sm font-semibold text-white">
              Select Student .xlsx Spreadsheet
            </span>
            <span className="text-slate-400 mt-1">Supports .xlsx and .xls files</span>
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
              className="rounded-xl bg-sky-500 text-slate-950 font-semibold px-5 py-2.5 cursor-pointer"
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
          <div className="rounded-2xl bg-[#0B0D14] border border-white/8 p-4 space-y-3 max-h-80 overflow-y-auto">
            {currentStudent.messages.map(m => (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl border text-xs ${
                  m.isAlert
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                    : m.senderRole === 'COACH'
                    ? 'border-sky-500/30 bg-sky-500/10 text-white mr-6'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-white ml-6'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="text-sky-400 font-semibold">{m.senderName}</span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="leading-relaxed text-sm">{m.text}</p>
              </div>
            ))}
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
              className="flex-1 rounded-xl bg-[#0B0D14] border border-white/15 px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs px-5 py-3 flex items-center gap-1.5 cursor-pointer"
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
