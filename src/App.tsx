import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  BookOpen,
  Magnet,
  MessageSquare,
  Upload,
  Send,
  Smartphone,
  UserCheck,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { INITIAL_STUDENTS, createNewStudentProfile, DEFAULT_APP_SETTINGS } from './data/initialStudents';
import { WORKBOOK_WEEKS } from './data/workbookData';
import {
  StudentProfile,
  SupportingVideoItem,
  ShiftMagnet,
  WorkbookWeek,
  PlaybookPillar,
  CoachReviewStatus,
  AppEmailAndAdminSettings,
  ChatMessage,
  ChatMessageActionTarget
} from './types';
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
  upsertSingleStudentToSupabase,
  deleteStudentFromSupabase,
  fetchLessonsFromSupabase,
  upsertLessonsToSupabase,
  fetchAppSettingsFromSupabase,
  upsertAppSettingsToSupabase,
  subscribeToStudentsRealtime,
  subscribeToSupabaseAuth,
  isSupabaseConfigured
} from './lib/supabase';

const STORAGE_KEY = 'mcm_cam005_students_v5_clean';
const LESSONS_STORAGE_KEY = 'mcm_cam005_lessons_v2';
const SETTINGS_STORAGE_KEY = 'mcm_cam005_settings_v1';
const AUTH_SESSION_KEY = 'mcm_cam005_auth_session_v1';
const LEGACY_DEMO_IDS = new Set(['student-marcus', 'student-elena', 'student-devon']);

const getTodayDateISO = () => new Date().toISOString().slice(0, 10);

const normalizeStudentDailyStatus = (st: StudentProfile): StudentProfile => {
  const todayISO = getTodayDateISO();
  if (
    st.lastCompletedDateISO &&
    st.lastCompletedDateISO !== todayISO &&
    st.todayVideoStatus === 'COMPLETED'
  ) {
    return {
      ...st,
      todayVideoStatus: 'PENDING'
    };
  }
  return st;
};

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
      if (saved) {
        const parsed = JSON.parse(saved) as StudentProfile[];
        return parsed.map(normalizeStudentDailyStatus);
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_STUDENTS.map(normalizeStudentDailyStatus);
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

  const [appSettings, setAppSettings] = useState<AppEmailAndAdminSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_APP_SETTINGS;
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
  const [, setDbSyncStatus] = useState<'CONNECTING' | 'SYNCED' | 'LOCAL'>('CONNECTING');
  const [initialDbLoadDone, setInitialDbLoadDone] = useState(false);

  // Deep-link navigation targets (triggered from Chat Action pills)
  const [requestedCadenceSubTab, setRequestedCadenceSubTab] = useState<
    'STUDIO' | 'QUEUE' | 'CORE5' | 'PLAYBOOK' | undefined
  >(undefined);
  const [requestedVideoId, setRequestedVideoId] = useState<string | undefined>(undefined);
  const [requestedCoreVideoId, setRequestedCoreVideoId] = useState<string | undefined>(undefined);
  const [requestedLessonNumber, setRequestedLessonNumber] = useState<number | undefined>(undefined);

  // Modals & Push Banners
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStudentInboxModal, setShowStudentInboxModal] = useState(false);
  const [studentReplyInput, setStudentReplyInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [pushBanners, setPushBanners] = useState<PushBanner[]>([]);
  const [, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const inboxBottomRef = useRef<HTMLDivElement>(null);
  const dirtyStudentTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastLocalEditTimestampRef = useRef<Record<string, number>>({});
  const localStorageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStudentsRef = useRef<StudentProfile[]>(students);
  latestStudentsRef.current = students;

  const triggerWebPushAndBanner = useCallback(
    async (
      title: string,
      body: string,
      type: PushBanner['type'] = 'DAILY_LESSON'
    ) => {
      const newBanner: PushBanner = {
        id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    },
    []
  );

  // Schedule a debounced single-student Supabase upsert
  const scheduleSingleStudentSync = useCallback(
    (studentId: string) => {
      if (!isSupabaseConfigured) return;
      if (dirtyStudentTimersRef.current[studentId]) {
        clearTimeout(dirtyStudentTimersRef.current[studentId]);
      }
      dirtyStudentTimersRef.current[studentId] = setTimeout(() => {
        const target = latestStudentsRef.current.find(s => s.id === studentId);
        if (target) {
          upsertSingleStudentToSupabase(target).then(ok => {
            if (ok) setDbSyncStatus('SYNCED');
          });
        }
        delete dirtyStudentTimersRef.current[studentId];
      }, 350);
    },
    []
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
      const [remoteStudents, remoteLessons, remoteSettings] = await Promise.all([
        fetchStudentsFromSupabase(),
        fetchLessonsFromSupabase(),
        fetchAppSettingsFromSupabase()
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
          const normalizedInitial = INITIAL_STUDENTS.map(normalizeStudentDailyStatus);
          await upsertStudentsToSupabase(normalizedInitial);
          setStudents(normalizedInitial);
          setDbSyncStatus('SYNCED');
        } else {
          const enriched = realRemoteStudents.map(rs => {
            const fallback = INITIAL_STUDENTS.find(i => i.id === rs.id);
            if (rs.id === 'student-josh' && rs.fullListSize === 2840 && fallback) {
              return normalizeStudentDailyStatus(fallback);
            }
            return normalizeStudentDailyStatus({
              ...rs,
              email: rs.id === 'student-josh' ? 'joshbmagic@gmail.com' : rs.email || fallback?.email || '',
              accessCode:
                rs.accessCode ||
                fallback?.accessCode ||
                `${rs.name.split(' ')[0].toUpperCase()}-01`
            });
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

      if (remoteSettings) {
        const mergedAdmins = Array.from(
          new Set(['joshbmagic@gmail.com', ...(remoteSettings.adminEmails || [])])
        );
        setAppSettings({
          ...DEFAULT_APP_SETTINGS,
          ...remoteSettings,
          adminEmails: mergedAdmins,
          senderEmail: remoteSettings.senderEmail || 'support@2mmshift.me'
        });
      } else {
        await upsertAppSettingsToSupabase(DEFAULT_APP_SETTINGS);
      }

      setInitialDbLoadDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist students to localStorage with a 250ms debounce to avoid blocking fast typing
  useEffect(() => {
    if (localStorageTimerRef.current) {
      clearTimeout(localStorageTimerRef.current);
    }
    localStorageTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
      } catch {
        // ignore
      }
    }, 250);
    return () => {
      if (localStorageTimerRef.current) {
        clearTimeout(localStorageTimerRef.current);
      }
    };
  }, [students]);

  // Realtime subscription to mc_students so Coach & Student see live updates + push alerts
  useEffect(() => {
    if (!initialDbLoadDone || !isSupabaseConfigured) return;

    const unsubscribe = subscribeToStudentsRealtime(
      incomingStudent => {
        if (LEGACY_DEMO_IDS.has(incomingStudent.id)) return;
        const normalizedIncoming = normalizeStudentDailyStatus(incomingStudent);

        setStudents(prev => {
          const existing = prev.find(s => s.id === normalizedIncoming.id);
          if (!existing) {
            return [normalizedIncoming, ...prev];
          }

          // Detect newly arrived message from the opposite role to fire a recipient-side push banner
          if (normalizedIncoming.messages.length > existing.messages.length) {
            const newestMsg = normalizedIncoming.messages[normalizedIncoming.messages.length - 1];
            const isViewerAdmin = authSession.role === 'ADMIN';
            if (isViewerAdmin && newestMsg.senderRole === 'STUDENT') {
              triggerWebPushAndBanner(
                `New Activity from ${normalizedIncoming.name}`,
                newestMsg.text,
                'COACH_NUDGE'
              );
            } else if (
              !isViewerAdmin &&
              newestMsg.senderRole === 'COACH' &&
              normalizedIncoming.id === activeStudentId
            ) {
              triggerWebPushAndBanner(
                `Message from ${newestMsg.senderName}`,
                newestMsg.text,
                newestMsg.isAlert ? 'MISSED_ALERT' : 'COACH_NUDGE'
              );
            }
          }

          // Guard against stale Realtime echo overwriting active local typing
          const lastLocalEdit = lastLocalEditTimestampRef.current[normalizedIncoming.id] || 0;
          const isActivelyEditingLocally =
            Boolean(dirtyStudentTimersRef.current[normalizedIncoming.id]) ||
            Date.now() - lastLocalEdit < 1500;

          if (isActivelyEditingLocally) {
            // Preserve local worksheet/video edits while merging any newly arrived messages
            if (normalizedIncoming.messages.length > existing.messages.length) {
              return prev.map(s =>
                s.id === normalizedIncoming.id
                  ? { ...s, messages: normalizedIncoming.messages }
                  : s
              );
            }
            return prev;
          }

          return prev.map(s => (s.id === normalizedIncoming.id ? normalizedIncoming : s));
        });
      },
      deletedId => {
        setStudents(prev => prev.filter(s => s.id !== deletedId));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [initialDbLoadDone, authSession.role, activeStudentId, triggerWebPushAndBanner]);

  // Supabase Magic Link Auth Handshake
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const unsubscribe = subscribeToSupabaseAuth(email => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return;

      const isAdminEmail = appSettings.adminEmails.some(
        a => a.trim().toLowerCase() === normalizedEmail
      );
      const matchedStudent = latestStudentsRef.current.find(
        s => (s.email || '').trim().toLowerCase() === normalizedEmail
      );

      // If user is on /admin or matches an admin email without a specific ?student= param
      const params = new URLSearchParams(window.location.search);
      const requestedStudentParam = params.get('student');

      if (requestedStudentParam) {
        const paramStudent = latestStudentsRef.current.find(s => s.id === requestedStudentParam);
        if (paramStudent) {
          handleLoginStudent(paramStudent.id);
          return;
        }
      }

      if (window.location.pathname.toLowerCase() === '/admin' && isAdminEmail) {
        handleLoginAdmin();
      } else if (matchedStudent && authSession.role === 'UNAUTHENTICATED') {
        handleLoginStudent(matchedStudent.id);
      } else if (isAdminEmail && authSession.role === 'UNAUTHENTICATED') {
        handleLoginAdmin();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [appSettings.adminEmails, authSession.role]);

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

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch {
      // ignore
    }
    if (initialDbLoadDone && isSupabaseConfigured) {
      upsertAppSettingsToSupabase(appSettings);
    }
  }, [appSettings, initialDbLoadDone]);

  const currentStudent = students.find(s => s.id === activeStudentId) || students[0];
  const isAdminSession = authSession.role === 'ADMIN';

  const updateStudent = useCallback(
    (studentId: string, updater: (st: StudentProfile) => StudentProfile) => {
      lastLocalEditTimestampRef.current[studentId] = Date.now();
      setStudents(prev =>
        prev.map(s => {
          if (s.id !== studentId) return s;
          return updater(s);
        })
      );
      scheduleSingleStudentSync(studentId);
    },
    [scheduleSingleStudentSync]
  );

  const handleMarkMessagesRead = useCallback(
    (studentId: string) => {
      const isCoachViewer = authSession.role === 'ADMIN';
      updateStudent(studentId, st => {
        const needsUpdate = st.messages.some(m =>
          isCoachViewer
            ? m.senderRole === 'STUDENT' && m.readByCoach === false
            : m.senderRole === 'COACH' && m.readByStudent === false
        );
        if (!needsUpdate) return st;
        return {
          ...st,
          messages: st.messages.map(m =>
            isCoachViewer
              ? m.senderRole === 'STUDENT'
                ? { ...m, readByCoach: true }
                : m
              : m.senderRole === 'COACH'
              ? { ...m, readByStudent: true }
              : m
          )
        };
      });
    },
    [authSession.role, updateStudent]
  );

  // Auto-mark messages read when the Student/Header Inbox modal is opened
  useEffect(() => {
    if (showStudentInboxModal && currentStudent) {
      handleMarkMessagesRead(currentStudent.id);
      setTimeout(() => {
        inboxBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [showStudentInboxModal, currentStudent?.id, currentStudent?.messages.length, handleMarkMessagesRead]);

  const handleNavigateFromChatAction = (studentId: string, target: ChatMessageActionTarget) => {
    setActiveStudentId(studentId);
    setShowStudentInboxModal(false);

    if (target.tab === 'CADENCE') {
      setRoleMode('STUDENT');
      setActiveTab('CADENCE');
      if (target.subTab) setRequestedCadenceSubTab(target.subTab);
      if (target.videoId) setRequestedVideoId(target.videoId);
      if (target.coreVideoId) setRequestedCoreVideoId(target.coreVideoId);
    } else if (target.tab === 'WORKBOOK') {
      setRoleMode('STUDENT');
      setActiveTab('WORKBOOK');
      if (target.lessonNumber) setRequestedLessonNumber(target.lessonNumber);
    } else if (target.tab === 'MAGNETS') {
      setRoleMode('STUDENT');
      setActiveTab('MAGNETS');
    }
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

  const handleEditStudentVideo = (
    studentId: string,
    videoId: string,
    updates: Partial<SupportingVideoItem>
  ) => {
    updateStudent(studentId, st => ({
      ...st,
      supportingVideos: st.supportingVideos.map(v => (v.id === videoId ? { ...v, ...updates } : v))
    }));
  };

  const handleMarkVideoDone = (videoId: string, videoUrl: string) => {
    const todayISO = getTodayDateISO();
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });

    let wasResubmission = false;
    let nextStreak = currentStudent.streakDays;

    updateStudent(currentStudent.id, st => {
      const targetVideo = st.supportingVideos.find(v => v.id === videoId);
      const wasAlreadyDone = targetVideo?.status === 'Completed';
      wasResubmission = wasAlreadyDone;
      const alreadyPostedToday = st.lastCompletedDateISO === todayISO;
      const updatedStreak = wasAlreadyDone || alreadyPostedToday ? st.streakDays : st.streakDays + 1;
      nextStreak = updatedStreak;

      const videoLabel = targetVideo
        ? `Day #${String(targetVideo.dayNumber).padStart(2, '0')}: ${targetVideo.title}`
        : 'Daily Video';

      const submissionMsg: ChatMessage = {
        id: `msg-video-${Date.now()}`,
        senderRole: 'STUDENT',
        senderName: st.name,
        text: wasAlreadyDone
          ? `↻ Resubmitted updated link for ${videoLabel} — ${videoUrl}`
          : `🎬 Submitted verified link for ${videoLabel} — ${videoUrl}`,
        timestamp: formattedTime,
        relatedVideoTitle: videoLabel,
        readByStudent: true,
        readByCoach: false,
        actionTarget: {
          label: 'Review Video',
          tab: 'CADENCE',
          subTab: 'STUDIO',
          videoId
        }
      };

      return {
        ...st,
        streakDays: updatedStreak,
        todayVideoStatus: 'COMPLETED',
        lastCompletedDateISO: todayISO,
        minutesAvailableCurrent: wasAlreadyDone
          ? st.minutesAvailableCurrent
          : st.minutesAvailableCurrent + 3,
        supportingVideos: st.supportingVideos.map(v =>
          v.id === videoId
            ? {
                ...v,
                status: 'Completed',
                videoUrl,
                completedAt: wasAlreadyDone ? `Updated · ${formattedTime}` : `Verified · ${formattedTime}`,
                completedDateISO: todayISO,
                coachReviewStatus: 'Pending Review'
              }
            : v
        ),
        messages: [...st.messages, submissionMsg]
      };
    });

    triggerWebPushAndBanner(
      wasResubmission ? 'Revised Video Link Sent to Coach!' : 'Daily Video Link Verified!',
      wasResubmission
        ? `Your updated link (${videoUrl}) is back in Coach Josh's Review Queue.`
        : `Your social link (${videoUrl}) has been queued for Coach Review and your streak is now ${nextStreak} days.`,
      'DAILY_LESSON'
    );
  };

  const handleUpdatePillarStatus = (pillarId: string, status: string) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      playbook: st.playbook.map(p => (p.id === pillarId ? { ...p, status } : p))
    }));
  };

  const CORE_TO_WORKBOOK_PREFIX: Record<string, string> = {
    'core-b1': 'l10_doc',
    'core-b2': 'l11_prod',
    'core-b3': 'l12_proof',
    'core-b4': 'l13_owner'
  };

  const handleUpdateCoreVideoStatus = (
    coreId: string,
    status: 'Not Started' | 'In Progress' | 'Completed',
    url?: string,
    scriptDraft?: { S: string; H: string; I: string; F: string; T: string }
  ) => {
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });

    updateStudent(currentStudent.id, st => {
      const existingCore = st.coreVideos.find(c => c.id === coreId);
      const wasCompleted = existingCore?.status === 'Completed';
      const isNewlyCompleted = status === 'Completed' && !wasCompleted;
      const isResubmittingCompleted =
        status === 'Completed' &&
        wasCompleted &&
        url !== undefined &&
        (url !== existingCore?.videoUrl || existingCore?.coachReviewStatus === 'Needs Revision');

      // Accurately parse runtime (including B5's "~15 min each (5h total)" -> 300 mins)
      const runtimeMatch = existingCore?.runtimeTarget.match(/(\d+)/);
      const parsedMins =
        existingCore?.code === 'B5'
          ? 300
          : runtimeMatch
          ? parseInt(runtimeMatch[1], 10)
          : 15;

      // Two-way sync Core Video B1-B4 script drafts & URLs back into Workbook Lessons 10-13
      const wbPrefix = CORE_TO_WORKBOOK_PREFIX[coreId];
      const nextWorksheetAnswers = { ...st.worksheetAnswers };
      if (wbPrefix) {
        if (scriptDraft) {
          nextWorksheetAnswers[`${wbPrefix}_m08_s`] = scriptDraft.S || '';
          nextWorksheetAnswers[`${wbPrefix}_m08_h`] = scriptDraft.H || '';
          nextWorksheetAnswers[`${wbPrefix}_m08_i`] = scriptDraft.I || '';
          nextWorksheetAnswers[`${wbPrefix}_m08_f`] = scriptDraft.F || '';
          nextWorksheetAnswers[`${wbPrefix}_m08_t`] = scriptDraft.T || '';
        }
        if (url !== undefined) {
          nextWorksheetAnswers[`${wbPrefix}_m12_thumb_cta`] = url;
        }
      }

      let updatedMessages = st.messages;
      if ((isNewlyCompleted || isResubmittingCompleted) && existingCore && url) {
        const coreLabel = `Core ${existingCore.code}: ${existingCore.name}`;
        const coreMsg: ChatMessage = {
          id: `msg-core-${Date.now()}`,
          senderRole: 'STUDENT',
          senderName: st.name,
          text: isResubmittingCompleted
            ? `↻ Resubmitted Core Brand Video ${coreLabel} — ${url}`
            : `★ Completed Core Brand Video ${coreLabel} (+${parsedMins}m Time on Brand) — ${url}`,
          timestamp: formattedTime,
          relatedVideoTitle: coreLabel,
          readByStudent: true,
          readByCoach: false,
          actionTarget: {
            label: `Open Core ${existingCore.code}`,
            tab: 'CADENCE',
            subTab: 'CORE5',
            coreVideoId: coreId
          }
        };
        updatedMessages = [...st.messages, coreMsg];
      }

      return {
        ...st,
        minutesAvailableCurrent: isNewlyCompleted
          ? st.minutesAvailableCurrent + parsedMins
          : st.minutesAvailableCurrent,
        worksheetAnswers: nextWorksheetAnswers,
        coreVideos: st.coreVideos.map(c =>
          c.id === coreId
            ? {
                ...c,
                status,
                videoUrl: url !== undefined ? url : c.videoUrl,
                scriptDraft: scriptDraft !== undefined ? scriptDraft : c.scriptDraft,
                coachReviewStatus:
                  status === 'Completed' ? 'Pending Review' : c.coachReviewStatus
              }
            : c
        ),
        messages: updatedMessages
      };
    });

    if (status === 'Completed' && url) {
      triggerWebPushAndBanner(
        'Core Brand Video Submitted!',
        `Your Core Brand Video link (${url}) has been queued for Coach Review.`,
        'DAILY_LESSON'
      );
    }
  };

  const handleReviewStudentVideo = (
    studentId: string,
    videoType: 'SUPPORTING' | 'CORE',
    videoId: string,
    reviewStatus: CoachReviewStatus,
    feedback: string
  ) => {
    const reviewedTime = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    updateStudent(studentId, st => {
      let videoLabel = 'Video';
      const updatedSupporting =
        videoType === 'SUPPORTING'
          ? st.supportingVideos.map(v => {
              if (v.id === videoId) {
                videoLabel = `Day #${String(v.dayNumber).padStart(2, '0')}: ${v.title}`;
                return {
                  ...v,
                  coachReviewStatus: reviewStatus,
                  coachFeedback: feedback,
                  coachReviewedAt: reviewedTime
                };
              }
              return v;
            })
          : st.supportingVideos;

      const updatedCore =
        videoType === 'CORE'
          ? st.coreVideos.map(c => {
              if (c.id === videoId) {
                videoLabel = `${c.code}: ${c.name}`;
                return {
                  ...c,
                  coachReviewStatus: reviewStatus,
                  coachFeedback: feedback,
                  coachReviewedAt: reviewedTime
                };
              }
              return c;
            })
          : st.coreVideos;

      const statusPrefix = reviewStatus === 'Approved' ? '✓ APPROVED' : '↻ REVISION REQUESTED';
      const noteMsg: ChatMessage = {
        id: `msg-review-${Date.now()}`,
        senderRole: 'COACH',
        senderName: 'Coach Josh Beechraft',
        text: `[${statusPrefix}] ${videoLabel}${feedback ? ` — "${feedback}"` : ''}`,
        timestamp: reviewedTime,
        relatedVideoTitle: videoLabel,
        isAlert: reviewStatus === 'Needs Revision',
        readByCoach: true,
        readByStudent: false,
        actionTarget:
          videoType === 'SUPPORTING'
            ? {
                label: reviewStatus === 'Needs Revision' ? 'Fix & Resubmit Video' : 'View Video in Studio',
                tab: 'CADENCE',
                subTab: 'STUDIO',
                videoId
              }
            : {
                label: reviewStatus === 'Needs Revision' ? 'Update Core Video' : 'View Core Video',
                tab: 'CADENCE',
                subTab: 'CORE5',
                coreVideoId: videoId
              }
      };

      return {
        ...st,
        supportingVideos: updatedSupporting,
        coreVideos: updatedCore,
        messages: [...st.messages, noteMsg]
      };
    });

    const recipient = students.find(s => s.id === studentId);
    triggerWebPushAndBanner(
      `Review Sent to ${recipient?.name || 'Student'} (${reviewStatus})`,
      feedback || `Marked video as ${reviewStatus}.`,
      reviewStatus === 'Needs Revision' ? 'MISSED_ALERT' : 'COACH_NUDGE'
    );
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
    updateStudent(currentStudent.id, st => {
      const nextWorksheetAnswers = {
        ...st.worksheetAnswers,
        [fieldId]: value
      };

      // Two-way sync Lessons 10-13 worksheet fields (l10_doc, l11_prod, l12_proof, l13_owner) into Core Videos B1-B4
      const coreMatch = fieldId.match(/^(l10_doc|l11_prod|l12_proof|l13_owner)_m(08_[shift]|12_thumb_cta)$/);
      let nextCoreVideos = st.coreVideos;
      if (coreMatch) {
        const prefix = coreMatch[1];
        const fieldSuffix = coreMatch[2];
        const targetCoreId =
          prefix === 'l10_doc'
            ? 'core-b1'
            : prefix === 'l11_prod'
            ? 'core-b2'
            : prefix === 'l12_proof'
            ? 'core-b3'
            : 'core-b4';

        nextCoreVideos = st.coreVideos.map(cv => {
          if (cv.id !== targetCoreId) return cv;
          if (fieldSuffix === '12_thumb_cta') {
            return {
              ...cv,
              videoUrl: value,
              status: cv.status === 'Not Started' && value.trim() ? 'In Progress' : cv.status
            };
          }
          const stageLetter = fieldSuffix.slice(-1).toUpperCase() as 'S' | 'H' | 'I' | 'F' | 'T';
          const currentDraft = cv.scriptDraft || { S: '', H: '', I: '', F: '', T: '' };
          return {
            ...cv,
            status: cv.status === 'Not Started' && value.trim() ? 'In Progress' : cv.status,
            scriptDraft: {
              ...currentDraft,
              [stageLetter]: value
            }
          };
        });
      }

      return {
        ...st,
        worksheetAnswers: nextWorksheetAnswers,
        coreVideos: nextCoreVideos
      };
    });
  };

  const handleSyncShiftMagnetFromLesson21 = () => {
    updateStudent(currentStudent.id, st => {
      const ans = st.worksheetAnswers;
      const workingTitle = (ans['m16_magnet_title'] || '').trim() || 'Custom Shift Magnet';
      const keywordRaw = (ans['m16_version'] || 'SHIFT').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      const keywordTrigger = keywordRaw.length >= 2 && keywordRaw.length <= 16 ? keywordRaw : 'SHIFT';

      const formatVal = (ans['m16_format'] || '').toLowerCase();
      const deliveryFormat: ShiftMagnet['deliveryFormat'] = formatVal.includes('check')
        ? 'Checklist'
        : formatVal.includes('video') || formatVal.includes('loom')
        ? 'Video'
        : formatVal.includes('gpt')
        ? 'Custom GPT'
        : formatVal.includes('class')
        ? 'Class'
        : formatVal.includes('pdf')
        ? 'PDF'
        : 'Audit';

      const syncedMagnet: ShiftMagnet = {
        id: 'magnet-lesson21',
        workingTitle,
        version: ans['m16_version'] || 'v1.0',
        specificAudience: ans['m16_audience'] || st.niche,
        triggeringProblem: ans['m16_problem'] || 'Solves the immediate bottleneck blocking the 2mm Shift',
        promiseOneSentence:
          ans['m16_promise'] || ans['m02_q1_transformation'] || 'Achieve the next step in under 10 minutes',
        beliefItShifts: ans['m16_belief'] || ans['m02_q4_belief'] || 'Results over rhetoric',
        completionTime: ans['m16_time'] || '7 minutes',
        deliveryFormat,
        keywordTrigger,
        trackingLink: ans['m16_link'] || ans['m16_hosted'] || '',
        dmHandoffScript:
          ans['m16_thankyou'] ||
          `Here is the ${workingTitle} (${ans['m16_link'] || 'link'}) — let me know which item stood out most!`,
        status: (ans['m16_link'] || '').trim() ? 'Live' : 'Draft'
      };

      const exists = st.shiftMagnets.some(m => m.id === 'magnet-lesson21');
      const nextMagnets = exists
        ? st.shiftMagnets.map(m => (m.id === 'magnet-lesson21' ? syncedMagnet : m))
        : [syncedMagnet, ...st.shiftMagnets];

      return {
        ...st,
        shiftMagnets: nextMagnets
      };
    });

    triggerWebPushAndBanner(
      'Shift Magnet Synced to Studio!',
      'Your Lesson 21 Shift Magnet is now live in the Shift Magnets tab and Studio Step 2 CTA dropdown.',
      'DAILY_LESSON'
    );
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

  const handleCompleteLesson = (lessonNumber: number, nextLesson: number) => {
    updateStudent(currentStudent.id, st => {
      const targetWeek = Math.max(st.currentWeek, nextLesson);
      const nextPhase =
        targetWeek <= 4 ? 1 : targetWeek <= 8 ? 2 : targetWeek <= 18 ? 3 : targetWeek <= 22 ? 4 : 5;
      return {
        ...st,
        currentWeek: targetWeek,
        currentPhase: Math.max(st.currentPhase, nextPhase)
      };
    });
    triggerWebPushAndBanner(
      `Lesson ${String(lessonNumber).padStart(2, '0')} Completed`,
      `Progress saved! Advancing to Lesson ${String(nextLesson).padStart(2, '0')}.`,
      'DAILY_LESSON'
    );
  };

  const handleSubmitPhaseGate = (phaseNumber: number, nextLesson: number) => {
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
    const gateLessonNum =
      phaseNumber === 1 ? 4 : phaseNumber === 2 ? 8 : phaseNumber === 3 ? 18 : phaseNumber === 4 ? 22 : 26;

    updateStudent(currentStudent.id, st => {
      const gateMsg: ChatMessage = {
        id: `msg-gate-submit-${Date.now()}`,
        senderRole: 'STUDENT',
        senderName: st.name,
        text: `◆ Submitted Phase 0${phaseNumber} Gate (Lesson ${String(gateLessonNum).padStart(2, '0')}) for Coach Sign-Off.`,
        timestamp: formattedTime,
        readByStudent: true,
        readByCoach: false,
        actionTarget: {
          label: `Inspect Phase 0${phaseNumber} Gate`,
          tab: 'WORKBOOK',
          lessonNumber: gateLessonNum
        }
      };

      return {
        ...st,
        currentWeek: Math.max(st.currentWeek, nextLesson),
        worksheetAnswers: {
          ...st.worksheetAnswers,
          [`phase_gate_status_${phaseNumber}`]: 'SUBMITTED'
        },
        gateStatus: {
          ...st.gateStatus,
          [phaseNumber]: 'SUBMITTED'
        },
        messages: [...st.messages, gateMsg]
      };
    });

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
    // Always determine sender identity from authenticated session role so Admin Preview never spoofs the student
    const isCoachSender = authSession.role === 'ADMIN';
    const senderRole: 'COACH' | 'STUDENT' = isCoachSender ? 'COACH' : 'STUDENT';
    const targetStudent = students.find(s => s.id === studentId) || currentStudent;
    const senderName = isCoachSender ? 'Coach Josh Beechraft' : targetStudent.name;
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderRole,
      senderName,
      text,
      timestamp: formattedTime,
      readByCoach: isCoachSender,
      readByStudent: !isCoachSender
    };

    updateStudent(studentId, st => ({
      ...st,
      messages: [...st.messages, newMsg]
    }));

    if (triggerPush) {
      triggerWebPushAndBanner(
        isCoachSender
          ? `Message Sent to ${targetStudent.name}`
          : `Message Sent to Coach Josh`,
        `"${text}"`,
        'COACH_NUDGE'
      );
    }
  };

  const handleTriggerMissedAlertPush = (missedStudent: StudentProfile) => {
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
    const nextPendingVideo =
      missedStudent.supportingVideos.find(v => v.status !== 'Completed') ||
      missedStudent.supportingVideos[0];

    const alertMsg: ChatMessage = {
      id: `msg-alert-${Date.now()}`,
      senderRole: 'COACH',
      senderName: 'Coach Josh Beechraft',
      text: `⚡ Daily Cadence Check-In: Your <10-minute Concussion Content video (${
        nextPendingVideo ? `Day #${String(nextPendingVideo.dayNumber).padStart(2, '0')}: "${nextPendingVideo.title}"` : 'Today’s Video'
      }) is due today. Jump into Studio to shoot and verify your link!`,
      timestamp: formattedTime,
      isAlert: true,
      readByCoach: true,
      readByStudent: false,
      actionTarget: {
        label: 'Open Studio & Shoot Now',
        tab: 'CADENCE',
        subTab: 'STUDIO',
        videoId: nextPendingVideo?.id
      }
    };

    updateStudent(missedStudent.id, st => ({
      ...st,
      messages: [...st.messages, alertMsg]
    }));

    triggerWebPushAndBanner(
      `Coach Alert Sent to ${missedStudent.name}`,
      `Delivered daily cadence nudge into ${missedStudent.name}’s inbox and push stream.`,
      'MISSED_ALERT'
    );
  };

  const handleApproveGate = (studentId: string, phaseNum: number) => {
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
    const nextPhase = Math.min(5, phaseNum + 1);
    const nextPhaseStartLesson =
      phaseNum === 1 ? 5 : phaseNum === 2 ? 9 : phaseNum === 3 ? 19 : phaseNum === 4 ? 23 : 26;

    updateStudent(studentId, st => {
      const approvalMsg: ChatMessage = {
        id: `msg-gate-approve-${Date.now()}`,
        senderRole: 'COACH',
        senderName: 'Coach Josh Beechraft',
        text: `✓ PHASE 0${phaseNum} GATE APPROVED! Great execution — you are officially cleared for Phase 0${nextPhase} (starting at Lesson ${String(
          nextPhaseStartLesson
        ).padStart(2, '0')}).`,
        timestamp: formattedTime,
        readByCoach: true,
        readByStudent: false,
        actionTarget: {
          label: `Open Lesson ${String(nextPhaseStartLesson).padStart(2, '0')}`,
          tab: 'WORKBOOK',
          lessonNumber: nextPhaseStartLesson
        }
      };

      return {
        ...st,
        currentPhase: Math.max(st.currentPhase, nextPhase),
        currentWeek: Math.max(st.currentWeek, nextPhaseStartLesson),
        worksheetAnswers: {
          ...st.worksheetAnswers,
          [`phase_gate_status_${phaseNum}`]: 'APPROVED'
        },
        gateStatus: {
          ...st.gateStatus,
          [phaseNum]: 'APPROVED',
          [nextPhase]: 'OPEN'
        },
        messages: [...st.messages, approvalMsg]
      };
    });

    const target = students.find(s => s.id === studentId);
    triggerWebPushAndBanner(
      `Phase 0${phaseNum} Gate Approved`,
      `${target?.name} is now cleared to advance to Phase 0${nextPhase}.`,
      'DAILY_LESSON'
    );
  };

  const handleSpreadsheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('Parsing .xlsx workbook...');
      const parsed = await parseStudentSpreadsheet(file);
      updateStudent(currentStudent.id, st => {
        // Non-destructively merge Playbook Pillars (preserve status by id or pillar title)
        const mergedPlaybook =
          parsed.playbook.length > 0
            ? parsed.playbook.map(incomingPillar => {
                const existingPillar = st.playbook.find(
                  p => p.id === incomingPillar.id || p.pillar === incomingPillar.pillar
                );
                return existingPillar
                  ? { ...incomingPillar, status: existingPillar.status }
                  : incomingPillar;
              })
            : st.playbook;

        // Non-destructively merge Supporting Videos (preserve completed links, coach reviews, custom hooks, notes by dayNumber)
        const mergedSupporting =
          parsed.supporting.length > 0
            ? parsed.supporting.map(incomingVideo => {
                const existingVideo = st.supportingVideos.find(
                  v => v.dayNumber === incomingVideo.dayNumber || v.id === incomingVideo.id
                );
                if (!existingVideo) return incomingVideo;
                return {
                  ...incomingVideo,
                  id: existingVideo.id,
                  status: existingVideo.status,
                  videoUrl: existingVideo.videoUrl,
                  completedAt: existingVideo.completedAt,
                  completedDateISO: existingVideo.completedDateISO,
                  coachReviewStatus: existingVideo.coachReviewStatus,
                  coachFeedback: existingVideo.coachFeedback,
                  coachReviewedAt: existingVideo.coachReviewedAt,
                  selectedHook: existingVideo.selectedHook,
                  customHook: existingVideo.customHook,
                  notes: existingVideo.notes,
                  attachedMagnetId: existingVideo.attachedMagnetId || incomingVideo.attachedMagnetId
                };
              })
            : st.supportingVideos;

        return {
          ...st,
          playbook: mergedPlaybook,
          supportingVideos: mergedSupporting
        };
      });
      setImportStatus(
        `Successfully merged ${parsed.playbook.length} Core Playbook Pillars and ${parsed.supporting.length} Daily Supporting Videos for ${currentStudent.name} (all completed links & coach reviews preserved)!`
      );
    } catch (err) {
      setImportStatus(`Error parsing file: ${err instanceof Error ? err.message : 'Invalid format'}`);
    }
  };

  const handleAddStudent = (params: {
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
  }) => {
    const created = createNewStudentProfile(params);
    setStudents(prev => [created, ...prev]);
    setActiveStudentId(created.id);
    if (isSupabaseConfigured) {
      upsertSingleStudentToSupabase(created);
    }
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
    video: { pillarId?: string; pillarStage: string; title: string; hook1: string; hook2: string; hook3: string }
  ) => {
    updateStudent(studentId, st => {
      const nextDayNum = st.supportingVideos.length + 1;
      const newVideo: SupportingVideoItem = {
        id: `supp-custom-${Date.now()}`,
        dayNumber: nextDayNum,
        pillarId: video.pillarId,
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
        adminEmails={appSettings.adminEmails}
        initialMode={initialMode}
        onLoginStudent={handleLoginStudent}
        onLoginAdmin={handleLoginAdmin}
      />
    );
  }

  const unreadMessagesForCurrentViewer = isAdminSession
    ? currentStudent.messages.filter(m => m.senderRole === 'STUDENT' && m.readByCoach === false).length
    : currentStudent.messages.filter(m => m.senderRole === 'COACH' && m.readByStudent === false).length;

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
          {/* Official THE 2MM SHIFT Logo & JOSH BEECHRAFT Brand Header */}
          <div className="px-1 pt-1 space-y-2.5">
            <img
              src="/2mmshift-logo-wide.png"
              alt="The 2mm Shift"
              className="h-12 w-auto object-contain select-none"
            />
            <div className="flex items-center gap-2 pl-0.5">
              <span className="w-3.5 h-[1.5px] bg-[#09ADEF]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                JOSH BEECHRAFT · ARCHITECT
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
              Coach Preview Mode: Viewing <strong className="text-white">{currentStudent.name}</strong> (Messages still send as Coach Josh)
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
              <img
                src="/2mmshift-logo-wide.png"
                alt="The 2mm Shift"
                className="md:hidden h-8 w-auto object-contain shrink-0 mr-1 select-none"
              />
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                  unreadMessagesForCurrentViewer > 0
                    ? 'bg-[#09ADEF]/15 border-[#09ADEF] text-white shadow-[0_0_16px_rgba(9,173,239,0.25)]'
                    : 'bg-[#0A0C10] hover:bg-white/[0.08] border-white/10 text-neutral-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#09ADEF]" />
                <span className="hidden sm:inline">Messages</span>
                {unreadMessagesForCurrentViewer > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {unreadMessagesForCurrentViewer} New
                  </span>
                ) : (
                  currentStudent.messages.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#09ADEF]/20 text-[#09ADEF] text-[10px] font-bold">
                      {currentStudent.messages.length}
                    </span>
                  )
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
              requestedSubTab={requestedCadenceSubTab}
              requestedVideoId={requestedVideoId}
              requestedCoreVideoId={requestedCoreVideoId}
              onClearRequestedNavigation={() => {
                setRequestedCadenceSubTab(undefined);
                setRequestedVideoId(undefined);
                setRequestedCoreVideoId(undefined);
              }}
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
              onCompleteLesson={handleCompleteLesson}
              onSubmitPhaseGate={handleSubmitPhaseGate}
              onSyncShiftMagnetFromLesson21={handleSyncShiftMagnetFromLesson21}
              requestedLessonNumber={requestedLessonNumber}
              onClearRequestedLesson={() => setRequestedLessonNumber(undefined)}
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
              lessons={lessons}
              selectedStudentId={activeStudentId}
              onSelectStudent={setActiveStudentId}
              appSettings={appSettings}
              onUpdateAppSettings={setAppSettings}
              onAddStudent={handleAddStudent}
              onUpdateStudentSpecifics={handleUpdateStudentSpecifics}
              onAddCustomVideoToStudent={handleAddCustomVideoToStudent}
              onEditStudentVideo={handleEditStudentVideo}
              onDeleteStudent={handleDeleteStudent}
              onSendMessage={handleSendMessage}
              onMarkMessagesRead={handleMarkMessagesRead}
              onNavigateFromChatAction={handleNavigateFromChatAction}
              onReviewStudentVideo={handleReviewStudentVideo}
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
            <code className="text-[#09ADEF]">josh_content_tracking-v2.xlsx</code>) to automatically populate or update:
          </p>
          <ul className="space-y-1.5 text-neutral-300 list-disc pl-5">
            <li>
              <strong>Content Playbook:</strong> 15 Core Pillars, Old/New Beliefs, Must-Hit Beats, and 4 Teaching Angles.
            </li>
            <li>
              <strong>Concussion Content:</strong> 50 Daily Micro-Topics with Hooks 1, 2, and 3 (preserving any completed video links and coach reviews).
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

      {/* Modal 2: Student & Coach In-App Chat Inbox */}
      <ModalDialog
        isOpen={showStudentInboxModal}
        onClose={() => setShowStudentInboxModal(false)}
        title={`Coach & Student Messages (${currentStudent.name})`}
        subtitle="Direct In-App Accountability & Action Links"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#05070A] border border-white/[0.07] p-4 space-y-3 max-h-80 overflow-y-auto">
            {currentStudent.messages.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No messages yet.
              </div>
            ) : (
              currentStudent.messages.map(m => {
                const isOwnMessage = isAdminSession
                  ? m.senderRole === 'COACH'
                  : m.senderRole === 'STUDENT';

                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      m.isAlert
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                        : isOwnMessage
                        ? 'border-[#09ADEF]/35 bg-[#09ADEF]/12 text-white ml-6'
                        : 'border-white/12 bg-white/[0.04] text-neutral-100 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                      <span className="text-[#09ADEF] font-semibold">{m.senderName}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="leading-relaxed text-sm">{m.text}</p>
                    {m.actionTarget && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleNavigateFromChatAction(currentStudent.id, m.actionTarget!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09ADEF]/20 hover:bg-[#09ADEF]/30 border border-[#09ADEF]/40 text-[11px] font-bold text-[#09ADEF] cursor-pointer"
                        >
                          <span>{m.actionTarget.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={inboxBottomRef} />
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
                isAdminSession
                  ? `Message ${currentStudent.name} as Coach Josh...`
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
