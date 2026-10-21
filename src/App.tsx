import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
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
  ExternalLink,
  Users,
  Radio,
  FolderOpen
} from 'lucide-react';
import {
  INITIAL_STUDENTS,
  createNewStudentProfile,
  DEFAULT_APP_SETTINGS,
  INITIAL_GROUP_POSTS,
  INITIAL_UPCOMING_CALL,
  INITIAL_CALL_REPLAYS,
  INITIAL_RESOURCES
} from './data/initialStudents';
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
  ChatMessageActionTarget,
  GroupDiscussionPost,
  GroupDiscussionCategory,
  GroupDiscussionComment,
  UpcomingCoachingCall,
  CoachingCallReplay,
  CoachingResourceItem,
  WeeklyScorecardCheckIn
} from './types';
import { DailyCadenceView } from './components/DailyCadenceView';
import { LoginView } from './components/LoginView';
import { ModalDialog } from './components/ModalDialog';
import { parseStudentSpreadsheet } from './utils/excelParser';
import { triggerGhlWebhook } from './lib/ghlWebhook';

const WorkbookView = lazy(() =>
  import('./components/WorkbookView').then(m => ({ default: m.WorkbookView }))
);
const ShiftMagnetsView = lazy(() =>
  import('./components/ShiftMagnetsView').then(m => ({ default: m.ShiftMagnetsView }))
);
const OutstandDmCrmPanel = lazy(() =>
  import('./components/OutstandDmCrmPanel').then(m => ({ default: m.OutstandDmCrmPanel }))
);
const CoachDashboardView = lazy(() =>
  import('./components/CoachDashboardView').then(m => ({ default: m.CoachDashboardView }))
);
const GroupDiscussionView = lazy(() =>
  import('./components/GroupDiscussionView').then(m => ({ default: m.GroupDiscussionView }))
);
const VaultAndCallsView = lazy(() =>
  import('./components/VaultAndCallsView').then(m => ({ default: m.VaultAndCallsView }))
);
import {
  fetchStudentsFromSupabase,
  upsertStudentsToSupabase,
  upsertSingleStudentToSupabase,
  deleteStudentFromSupabase,
  fetchLessonsFromSupabase,
  upsertLessonsToSupabase,
  upsertSingleLessonToSupabase,
  fetchAppSettingsFromSupabase,
  upsertAppSettingsToSupabase,
  fetchGroupDiscussionsFromSupabase,
  upsertGroupDiscussionsToSupabase,
  subscribeToGroupDiscussionsRealtime,
  subscribeToStudentsRealtime,
  subscribeToSupabaseAuth,
  isSupabaseConfigured
} from './lib/supabase';

const STORAGE_KEY = 'mcm_cam005_students_v5_clean';
const LESSONS_STORAGE_KEY = 'mcm_cam005_lessons_v2';
const SETTINGS_STORAGE_KEY = 'mcm_cam005_settings_v1';
const GROUP_POSTS_STORAGE_KEY = 'mcm_cam005_group_posts_v1';
const UPCOMING_CALL_STORAGE_KEY = 'mcm_cam005_upcoming_call_v1';
const CALL_REPLAYS_STORAGE_KEY = 'mcm_cam005_call_replays_v1';
const RESOURCES_STORAGE_KEY = 'mcm_cam005_resources_v1';
const AUTH_SESSION_KEY = 'mcm_cam005_auth_session_v1';
const ACTIVE_TAB_STORAGE_KEY = 'mcm_cam005_active_tab_v1';
const LEGACY_DEMO_IDS = new Set(['student-marcus', 'student-elena', 'student-devon']);

const getTodayDateISO = () => new Date().toISOString().slice(0, 10);
const getYesterdayDateISO = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const normalizeStudentDailyStatus = (st: StudentProfile): StudentProfile => {
  const todayISO = getTodayDateISO();
  const yesterdayISO = getYesterdayDateISO();

  if (st.lastCompletedDateISO === todayISO) {
    return st.todayVideoStatus === 'COMPLETED' ? st : { ...st, todayVideoStatus: 'COMPLETED' };
  }

  if (st.lastCompletedDateISO && st.lastCompletedDateISO < yesterdayISO) {
    return st.todayVideoStatus === 'MISSED' && st.streakDays === 0
      ? st
      : { ...st, todayVideoStatus: 'MISSED', streakDays: 0 };
  }

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
  threadId?: string;
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

  const [groupPosts, setGroupPosts] = useState<GroupDiscussionPost[]>(() => {
    try {
      const saved = localStorage.getItem(GROUP_POSTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GroupDiscussionPost[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_GROUP_POSTS;
  });

  const [upcomingCall, setUpcomingCall] = useState<UpcomingCoachingCall>(() => {
    try {
      const saved = localStorage.getItem(UPCOMING_CALL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_UPCOMING_CALL;
  });

  const [callReplays, setCallReplays] = useState<CoachingCallReplay[]>(() => {
    try {
      const saved = localStorage.getItem(CALL_REPLAYS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CoachingCallReplay[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(r => {
            const fallback = INITIAL_CALL_REPLAYS.find(ir => ir.id === r.id);
            if (
              fallback &&
              (r.videoUrl.includes('loom.com/share/market-concussion-') ||
                r.videoUrl.includes('commondatastorage.googleapis.com'))
            ) {
              return fallback;
            }
            return r;
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_CALL_REPLAYS;
  });

  const [resources, setResources] = useState<CoachingResourceItem[]>(() => {
    try {
      const saved = localStorage.getItem(RESOURCES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_RESOURCES;
  });

  const [authSession, setAuthSession] = useState<AuthSession>(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const rawHref = window.location.href;
    const extractedSession =
      params.get('session') ||
      params.get('outstand_session') ||
      rawHref.match(/[?&](?:outstand_)?session=([^&#]+)/)?.[1] ||
      null;

    if (extractedSession) {
      try {
        sessionStorage.setItem('outstand_pending_session', decodeURIComponent(extractedSession));
      } catch {
        // ignore
      }
    }

    let pendingOAuthStudentId: string | null = null;
    try {
      const pendingRaw = localStorage.getItem('outstand_oauth_pending');
      if (pendingRaw) {
        const parsedPending = JSON.parse(pendingRaw);
        if (parsedPending?.studentId) {
          pendingOAuthStudentId = parsedPending.studentId;
        }
      }
    } catch {
      // ignore
    }

    const rawMagicStudentId = params.get('student')?.split('?')[0] || pendingOAuthStudentId;

    if (path === '/login') {
      return { role: 'UNAUTHENTICATED' };
    }
    if (rawMagicStudentId) {
      return { role: 'STUDENT', studentId: rawMagicStudentId };
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

  const [, setRoleMode] = useState<'STUDENT' | 'COACH'>(() =>
    window.location.pathname.toLowerCase() === '/admin' ? 'COACH' : 'STUDENT'
  );
  const [activeTab, setActiveTab] = useState<
    'CADENCE' | 'WORKBOOK' | 'MAGNETS' | 'CRM' | 'GROUP' | 'VAULT' | 'COACH'
  >(() => {
    if (window.location.pathname.toLowerCase() === '/admin') return 'COACH';
    const params = new URLSearchParams(window.location.search);
    const hasPendingOAuth = (() => {
      try {
        return Boolean(
          sessionStorage.getItem('outstand_pending_session') ||
            localStorage.getItem('outstand_oauth_pending')
        );
      } catch {
        return false;
      }
    })();
    if (
      hasPendingOAuth ||
      params.get('session') ||
      params.get('outstand_session') ||
      params.get('connected_network') ||
      params.get('tab')?.toUpperCase() === 'CRM' ||
      window.location.href.includes('session=')
    ) {
      return 'CRM';
    }
    const urlTab = params.get('tab')?.toUpperCase();
    const validTabs = new Set(['CADENCE', 'WORKBOOK', 'MAGNETS', 'CRM', 'GROUP', 'VAULT', 'COACH']);
    if (urlTab && validTabs.has(urlTab)) {
      return urlTab as 'CADENCE' | 'WORKBOOK' | 'MAGNETS' | 'CRM' | 'GROUP' | 'VAULT' | 'COACH';
    }
    try {
      const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)?.toUpperCase();
      if (savedTab && validTabs.has(savedTab)) {
        return savedTab as 'CADENCE' | 'WORKBOOK' | 'MAGNETS' | 'CRM' | 'GROUP' | 'VAULT' | 'COACH';
      }
    } catch {
      // ignore
    }
    return 'CADENCE';
  });
  const [activeStudentId, setActiveStudentId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const cleanParamStudent = params.get('student')?.split('?')[0];
    if (cleanParamStudent) return cleanParamStudent;
    try {
      const pendingRaw = localStorage.getItem('outstand_oauth_pending');
      if (pendingRaw) {
        const parsedPending = JSON.parse(pendingRaw);
        if (parsedPending?.studentId) return parsedPending.studentId;
      }
    } catch {
      // ignore
    }
    return INITIAL_STUDENTS[0].id;
  });
  const [dbSyncStatus, setDbSyncStatus] = useState<'CONNECTING' | 'SYNCING' | 'SYNCED' | 'LOCAL'>(
    isSupabaseConfigured ? 'CONNECTING' : 'LOCAL'
  );
  const [initialDbLoadDone, setInitialDbLoadDone] = useState(false);

  // Deep-link navigation targets (triggered from Chat Action pills)
  const [requestedCadenceSubTab, setRequestedCadenceSubTab] = useState<
    'STUDIO' | 'QUEUE' | 'CORE5' | 'PLAYBOOK' | undefined
  >(undefined);
  const [requestedVaultSubTab, setRequestedVaultSubTab] = useState<
    'CALLS' | 'RESOURCES' | 'SCORECARD' | undefined
  >(undefined);
  const [requestedVideoId, setRequestedVideoId] = useState<string | undefined>(undefined);
  const [requestedCoreVideoId, setRequestedCoreVideoId] = useState<string | undefined>(undefined);
  const [requestedLessonNumber, setRequestedLessonNumber] = useState<number | undefined>(undefined);
  const [requestedGroupPostId, setRequestedGroupPostId] = useState<string | undefined>(undefined);
  const [requestedCrmThreadId, setRequestedCrmThreadId] = useState<string | undefined>(undefined);

  // Modals & Push Banners
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStudentInboxModal, setShowStudentInboxModal] = useState(false);
  const [studentReplyInput, setStudentReplyInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [pushBanners, setPushBanners] = useState<PushBanner[]>([]);

  const inboxBottomRef = useRef<HTMLDivElement>(null);
  const dirtyStudentTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastLocalEditTimestampRef = useRef<Record<string, number>>({});
  const localStorageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStudentsRef = useRef<StudentProfile[]>(students);
  latestStudentsRef.current = students;
  const latestGroupPostsRef = useRef<GroupDiscussionPost[]>(groupPosts);
  latestGroupPostsRef.current = groupPosts;

  // Persist activeTab to localStorage so browser reloads stay on the same tab
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);

  const triggerWebPushAndBanner = useCallback(
    async (
      title: string,
      body: string,
      type: PushBanner['type'] = 'DAILY_LESSON',
      threadId?: string
    ) => {
      const bannerId = `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newBanner: PushBanner = {
        id: bannerId,
        title,
        body,
        type,
        threadId
      };
      setPushBanners(prev => [newBanner, ...prev.slice(0, 2)]);
      setTimeout(() => {
        setPushBanners(prev => prev.filter(x => x.id !== bannerId));
      }, 7500);

      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
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
      setDbSyncStatus('SYNCING');
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
      const [remoteStudents, remoteLessons, remoteSettings, remoteGroupPosts] = await Promise.all([
        fetchStudentsFromSupabase(),
        fetchLessonsFromSupabase(),
        fetchAppSettingsFromSupabase(),
        fetchGroupDiscussionsFromSupabase()
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
          const dirtyStudentsToUpsert: StudentProfile[] = [];
          const enriched = realRemoteStudents.map(rs => {
            const fallback = INITIAL_STUDENTS.find(i => i.id === rs.id);
            if (rs.id === 'student-josh' && rs.fullListSize === 2840 && fallback) {
              const normalizedFallback = normalizeStudentDailyStatus(fallback);
              dirtyStudentsToUpsert.push(normalizedFallback);
              return normalizedFallback;
            }
            const resolvedEmail =
              rs.id === 'student-josh' ? 'joshbmagic@gmail.com' : rs.email || fallback?.email || '';
            const resolvedAccessCode =
              rs.accessCode ||
              fallback?.accessCode ||
              `${rs.name.split(' ')[0].toUpperCase()}-01`;

            const normalized = normalizeStudentDailyStatus({
              ...rs,
              email: resolvedEmail,
              accessCode: resolvedAccessCode
            });

            if (
              normalized.todayVideoStatus !== rs.todayVideoStatus ||
              normalized.email !== rs.email ||
              normalized.accessCode !== rs.accessCode
            ) {
              dirtyStudentsToUpsert.push(normalized);
            }
            return normalized;
          });

          if (dirtyStudentsToUpsert.length > 0) {
            await upsertStudentsToSupabase(dirtyStudentsToUpsert);
          }
          setStudents(prev =>
            enriched.map(remoteSt => {
              const localEditTime = lastLocalEditTimestampRef.current[remoteSt.id] || 0;
              const localSt = prev.find(p => p.id === remoteSt.id);
              if (localEditTime > 0 && localSt) {
                return {
                  ...remoteSt,
                  worksheetAnswers: {
                    ...remoteSt.worksheetAnswers,
                    ...localSt.worksheetAnswers
                  }
                };
              }
              return remoteSt;
            })
          );
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

      if (remoteGroupPosts && remoteGroupPosts.length > 0) {
        setGroupPosts(remoteGroupPosts);
      } else if (remoteGroupPosts !== null) {
        await upsertGroupDiscussionsToSupabase(INITIAL_GROUP_POSTS);
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

  // Helper to merge an incoming remote StudentProfile (from Realtime or background sync) without clobbering active typing
  const mergeIncomingRemoteStudent = useCallback(
    (incomingStudent: StudentProfile) => {
      if (LEGACY_DEMO_IDS.has(incomingStudent.id)) return;
      const normalizedIncoming = normalizeStudentDailyStatus(incomingStudent);

      setStudents(prev => {
        const existing = prev.find(s => s.id === normalizedIncoming.id);
        if (!existing) {
          return [normalizedIncoming, ...prev];
        }

        // Detect newly arrived message from the opposite role (or SYSTEM / CRM notification) to fire a recipient-side push banner
        if (normalizedIncoming.messages.length > existing.messages.length) {
          const newestMsg = normalizedIncoming.messages[normalizedIncoming.messages.length - 1];
          const isViewerAdmin = authSession.role === 'ADMIN';
          if (isViewerAdmin && newestMsg.senderRole === 'STUDENT') {
            triggerWebPushAndBanner(
              `New Activity from ${normalizedIncoming.name}`,
              newestMsg.text,
              'COACH_NUDGE',
              newestMsg.actionTarget?.crmThreadId
            );
          } else if (
            !isViewerAdmin &&
            (newestMsg.senderRole === 'COACH' || newestMsg.senderRole === 'SYSTEM') &&
            normalizedIncoming.id === activeStudentId
          ) {
            triggerWebPushAndBanner(
              `Notification · ${newestMsg.senderName}`,
              newestMsg.text,
              newestMsg.isAlert ? 'MISSED_ALERT' : 'COACH_NUDGE',
              newestMsg.actionTarget?.crmThreadId
            );
          }
        }

        // Guard against stale echo overwriting active local typing
        const lastLocalEdit = lastLocalEditTimestampRef.current[normalizedIncoming.id] || 0;
        const isActivelyEditingLocally =
          Boolean(dirtyStudentTimersRef.current[normalizedIncoming.id]) ||
          Date.now() - lastLocalEdit < 2000;

        if (isActivelyEditingLocally) {
          const incomingThreadsJson = normalizedIncoming.worksheetAnswers?.['dm_crm_threads_json'];
          const existingThreadsJson = existing.worksheetAnswers?.['dm_crm_threads_json'];
          const hasNewMessages = normalizedIncoming.messages.length > existing.messages.length;
          const hasNewDmThreads = Boolean(
            incomingThreadsJson && incomingThreadsJson !== existingThreadsJson
          );
          if (hasNewMessages || hasNewDmThreads) {
            return prev.map(s =>
              s.id === normalizedIncoming.id
                ? {
                    ...s,
                    messages: hasNewMessages ? normalizedIncoming.messages : s.messages,
                    worksheetAnswers: hasNewDmThreads
                      ? {
                          ...s.worksheetAnswers,
                          dm_crm_threads_json: incomingThreadsJson
                        }
                      : s.worksheetAnswers
                  }
                : s
            );
          }
          return prev;
        }

        // Only trigger state update if messages or DM threads or status actually changed
        const prevSig = `${existing.messages.length}|${existing.worksheetAnswers?.['dm_crm_threads_json'] || ''}|${existing.todayVideoStatus}|${existing.currentWeek}`;
        const nextSig = `${normalizedIncoming.messages.length}|${normalizedIncoming.worksheetAnswers?.['dm_crm_threads_json'] || ''}|${normalizedIncoming.todayVideoStatus}|${normalizedIncoming.currentWeek}`;
        if (prevSig === nextSig) return prev;

        return prev.map(s => (s.id === normalizedIncoming.id ? normalizedIncoming : s));
      });
    },
    [authSession.role, activeStudentId, triggerWebPushAndBanner]
  );

  // Realtime subscription + 5s background sync to mc_students so Coach & Student see live webhook updates with zero refresh
  useEffect(() => {
    if (!initialDbLoadDone || !isSupabaseConfigured) return;

    const unsubscribe = subscribeToStudentsRealtime(
      incomingStudent => {
        mergeIncomingRemoteStudent(incomingStudent);
      },
      deletedId => {
        setStudents(prev => prev.filter(s => s.id !== deletedId));
      }
    );

    const pollInterval = setInterval(async () => {
      const remoteList = await fetchStudentsFromSupabase();
      if (!remoteList) return;
      for (const rs of remoteList) {
        mergeIncomingRemoteStudent(rs);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [initialDbLoadDone, mergeIncomingRemoteStudent]);

  // Realtime subscription to Cohort Group Discussions (mc_lessons week_number = -1)
  useEffect(() => {
    if (!initialDbLoadDone || !isSupabaseConfigured) return;
    const unsubscribe = subscribeToGroupDiscussionsRealtime(incomingPosts => {
      setGroupPosts(incomingPosts);
    });
    return () => {
      unsubscribe();
    };
  }, [initialDbLoadDone]);

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
  }, [lessons]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch {
      // ignore
    }
    if (!initialDbLoadDone || !isSupabaseConfigured) return;
    const timer = setTimeout(() => {
      upsertAppSettingsToSupabase(appSettings);
    }, 400);
    return () => clearTimeout(timer);
  }, [appSettings, initialDbLoadDone]);

  useEffect(() => {
    try {
      localStorage.setItem(GROUP_POSTS_STORAGE_KEY, JSON.stringify(groupPosts));
    } catch {
      // ignore
    }
  }, [groupPosts]);

  const saveGroupPosts = useCallback(
    (updater: (prev: GroupDiscussionPost[]) => GroupDiscussionPost[]) => {
      const next = updater(latestGroupPostsRef.current);
      latestGroupPostsRef.current = next;
      setGroupPosts(next);
      if (isSupabaseConfigured) {
        setDbSyncStatus('SYNCING');
        upsertGroupDiscussionsToSupabase(next).then(ok => {
          if (ok) setDbSyncStatus('SYNCED');
        });
      }
    },
    []
  );

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

  // Broadcast a Discussion or Vault notification into all students' inboxes so every student gets notified
  const broadcastCohortGroupNotification = useCallback(
    (params: {
      excludeStudentId?: string;
      senderName: string;
      text: string;
      relatedVideoTitle?: string;
      groupPostId?: string;
      actionLabel?: string;
    }) => {
      const formattedTime = new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });

      const updatedList = latestStudentsRef.current.map(st => {
        const isActor = st.id === params.excludeStudentId;
        const notifMsg: ChatMessage = {
          id: `msg-group-${Date.now()}-${st.id}`,
          senderRole: 'SYSTEM',
          senderName: params.groupPostId
            ? `Discussion · ${params.senderName}`
            : `Vault & Calls · ${params.senderName}`,
          text: params.text,
          timestamp: formattedTime,
          relatedVideoTitle: params.relatedVideoTitle,
          readByStudent: isActor,
          readByCoach: authSession.role === 'ADMIN',
          actionTarget: params.groupPostId
            ? {
                label: params.actionLabel || 'Open Discussion Thread',
                tab: 'GROUP',
                groupPostId: params.groupPostId
              }
            : {
                label: params.actionLabel || 'Watch Call Replay',
                tab: 'VAULT',
                vaultSubTab: 'CALLS'
              }
        };
        return {
          ...st,
          messages: [...st.messages, notifMsg]
        };
      });

      latestStudentsRef.current = updatedList;
      setStudents(updatedList);
      if (isSupabaseConfigured) {
        upsertStudentsToSupabase(updatedList);
      }
    },
    [authSession.role]
  );

  const handleMarkMessagesRead = useCallback(
    (studentId: string) => {
      const isCoachViewer = authSession.role === 'ADMIN';
      updateStudent(studentId, st => {
        const needsUpdate = st.messages.some(m =>
          isCoachViewer
            ? (m.senderRole === 'STUDENT' || m.senderRole === 'SYSTEM') && m.readByCoach === false
            : (m.senderRole === 'COACH' || m.senderRole === 'SYSTEM') && m.readByStudent === false
        );
        if (!needsUpdate) return st;
        return {
          ...st,
          messages: st.messages.map(m =>
            isCoachViewer
              ? m.senderRole === 'STUDENT' || m.senderRole === 'SYSTEM'
                ? { ...m, readByCoach: true }
                : m
              : m.senderRole === 'COACH' || m.senderRole === 'SYSTEM'
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
      setActiveTab('CADENCE');
      if (target.subTab) setRequestedCadenceSubTab(target.subTab);
      if (target.videoId) setRequestedVideoId(target.videoId);
      if (target.coreVideoId) setRequestedCoreVideoId(target.coreVideoId);
    } else if (target.tab === 'WORKBOOK') {
      setActiveTab('WORKBOOK');
      if (target.lessonNumber) setRequestedLessonNumber(target.lessonNumber);
    } else if (target.tab === 'MAGNETS') {
      setActiveTab('MAGNETS');
    } else if (target.tab === 'CRM') {
      setActiveTab('CRM');
      if (target.crmThreadId) setRequestedCrmThreadId(target.crmThreadId);
    } else if (target.tab === 'GROUP') {
      setActiveTab('GROUP');
      if (target.groupPostId) setRequestedGroupPostId(target.groupPostId);
    } else if (target.tab === 'VAULT') {
      setActiveTab('VAULT');
      if (target.vaultSubTab) setRequestedVaultSubTab(target.vaultSubTab);
    }
  };

  const handleTriggerCrmNotification = useCallback(
    (params: {
      senderLabel: string;
      text: string;
      bannerTitle: string;
      bannerBody: string;
      threadId: string;
      isAlert?: boolean;
      actionLabel?: string;
    }) => {
      const formattedTime = new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });

      const notifMsg: ChatMessage = {
        id: `msg-crm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderRole: 'SYSTEM',
        senderName: params.senderLabel,
        text: params.text,
        timestamp: formattedTime,
        isAlert: params.isAlert,
        readByStudent: false,
        readByCoach: false,
        actionTarget: {
          label: params.actionLabel || 'Open DM Thread in Live CRM',
          tab: 'CRM',
          crmThreadId: params.threadId
        }
      };

      updateStudent(currentStudent.id, st => ({
        ...st,
        dmConversationsWeekly: (st.dmConversationsWeekly || 0) + 1,
        messages: [...st.messages, notifMsg]
      }));

      triggerWebPushAndBanner(
        params.bannerTitle,
        params.bannerBody,
        params.isAlert ? 'COACH_NUDGE' : 'DAILY_LESSON',
        params.threadId
      );
    },
    [currentStudent.id, updateStudent, triggerWebPushAndBanner]
  );

  const handleUpdateLesson = (lessonNumber: number, updated: WorkbookWeek) => {
    setLessons(prev => prev.map(l => (l.weekNumber === lessonNumber ? updated : l)));
    if (isSupabaseConfigured) {
      setDbSyncStatus('SYNCING');
      upsertSingleLessonToSupabase(updated).then(ok => {
        if (ok) setDbSyncStatus('SYNCED');
      });
    }
    triggerWebPushAndBanner(
      `Lesson ${lessonNumber} Updated`,
      `Your edits to Lesson ${lessonNumber} ("${updated.title}") have been saved to the app curriculum.`,
      'DAILY_LESSON'
    );
  };

  const handleResetLessonsToDefault = () => {
    setLessons(WORKBOOK_WEEKS);
    localStorage.removeItem(LESSONS_STORAGE_KEY);
    if (isSupabaseConfigured) {
      setDbSyncStatus('SYNCING');
      upsertLessonsToSupabase(WORKBOOK_WEEKS).then(ok => {
        if (ok) setDbSyncStatus('SYNCED');
      });
    }
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

  // Create or update a VIDEO_SHARE post in the Cohort Group Feed and optionally notify all students
  const upsertVideoShareInGroupFeed = useCallback(
    (params: {
      student: StudentProfile;
      videoType: 'SUPPORTING' | 'CORE';
      videoId: string;
      videoUrl?: string;
      note?: string;
      coachReviewStatus?: CoachReviewStatus;
      coachFeedback?: string;
      coachReviewedAt?: string;
      notifyCohort?: boolean;
    }): string => {
      const { student: st, videoType, videoId } = params;
      const formattedStamp = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      const suppVid =
        videoType === 'SUPPORTING' ? st.supportingVideos.find(v => v.id === videoId) : undefined;
      const coreVid =
        videoType === 'CORE' ? st.coreVideos.find(c => c.id === videoId) : undefined;

      const badge = suppVid
        ? `DAY #${String(suppVid.dayNumber).padStart(2, '0')}`
        : coreVid
        ? `CORE ${coreVid.code}`
        : 'VIDEO';
      const title = suppVid
        ? `${badge}: ${suppVid.title}`
        : coreVid
        ? `${badge}: ${coreVid.name}`
        : 'Student Video Output';
      const stage = suppVid ? suppVid.pillarStage : coreVid ? coreVid.week : '';
      const resolvedUrl = params.videoUrl || suppVid?.videoUrl || coreVid?.videoUrl || '';
      const hookUsed = suppVid
        ? suppVid.customHook ||
          (suppVid.selectedHook === 2
            ? suppVid.hook2
            : suppVid.selectedHook === 3
            ? suppVid.hook3
            : suppVid.hook1)
        : coreVid?.purpose || '';

      const resolvedReviewStatus =
        params.coachReviewStatus || suppVid?.coachReviewStatus || coreVid?.coachReviewStatus;
      const resolvedFeedback =
        params.coachFeedback !== undefined
          ? params.coachFeedback
          : suppVid?.coachFeedback || coreVid?.coachFeedback;
      const resolvedReviewedAt =
        params.coachReviewedAt || suppVid?.coachReviewedAt || coreVid?.coachReviewedAt;

      const deterministicPostId = `group-video-${st.id}-${videoType}-${videoId}`;

      saveGroupPosts(prev => {
        const existing = prev.find(
          p =>
            p.id === deterministicPostId ||
            (p.type === 'VIDEO_SHARE' &&
              p.studentId === st.id &&
              p.videoType === videoType &&
              p.videoId === videoId)
        );

        if (existing) {
          return prev.map(p =>
            p.id === existing.id
              ? {
                  ...p,
                  title,
                  body: params.note !== undefined ? params.note : p.body,
                  videoUrl: resolvedUrl || p.videoUrl,
                  hookUsed: hookUsed || p.hookUsed,
                  coachReviewStatus: resolvedReviewStatus || p.coachReviewStatus,
                  coachFeedback:
                    resolvedFeedback !== undefined ? resolvedFeedback : p.coachFeedback,
                  coachReviewedAt: resolvedReviewedAt || p.coachReviewedAt
                }
              : p
          );
        }

        const newPost: GroupDiscussionPost = {
          id: deterministicPostId,
          type: 'VIDEO_SHARE',
          category: 'VIDEO_BREAKDOWN',
          authorId: st.id,
          authorName: st.name,
          authorAvatar: st.avatar,
          authorCompany: st.company,
          authorNiche: st.niche,
          authorRole: 'STUDENT',
          title,
          body:
            params.note ||
            `${st.name} shared a verified video output (${badge}) for peer learning and Coach feedback breakdown.`,
          timestamp: formattedStamp,
          createdAtISO: new Date().toISOString(),
          studentId: st.id,
          videoType,
          videoId,
          videoBadge: badge,
          videoStage: stage,
          videoUrl: resolvedUrl,
          hookUsed,
          coachReviewStatus: resolvedReviewStatus || 'Pending Review',
          coachFeedback: resolvedFeedback,
          coachReviewedAt: resolvedReviewedAt,
          reactions: {
            fire: [],
            shift: [],
            props: []
          },
          comments: []
        };

        return [newPost, ...prev];
      });

      if (params.notifyCohort) {
        broadcastCohortGroupNotification({
          excludeStudentId: st.id,
          senderName: st.name,
          text: `🎬 ${st.name} posted a new video to Discussion: "${title}"${
            params.note ? ` — "${params.note}"` : ''
          }. Watch & learn from their output!`,
          relatedVideoTitle: title,
          groupPostId: deterministicPostId,
          actionLabel: 'Watch & Discuss'
        });
      }

      return deterministicPostId;
    },
    [saveGroupPosts, broadcastCohortGroupNotification]
  );

  const handleShareVideoToGroup = useCallback(
    (params: {
      studentId: string;
      videoType: 'SUPPORTING' | 'CORE';
      videoId: string;
      note?: string;
      notifyCohort: boolean;
    }) => {
      const targetStudent =
        latestStudentsRef.current.find(s => s.id === params.studentId) || currentStudent;
      const postId = upsertVideoShareInGroupFeed({
        student: targetStudent,
        videoType: params.videoType,
        videoId: params.videoId,
        note: params.note,
        notifyCohort: params.notifyCohort
      });

      updateStudent(targetStudent.id, st => ({
        ...st,
        supportingVideos:
          params.videoType === 'SUPPORTING'
            ? st.supportingVideos.map(v =>
                v.id === params.videoId ? { ...v, sharedToGroup: true, groupPostId: postId } : v
              )
            : st.supportingVideos,
        coreVideos:
          params.videoType === 'CORE'
            ? st.coreVideos.map(c =>
                c.id === params.videoId ? { ...c, sharedToGroup: true, groupPostId: postId } : c
              )
            : st.coreVideos
      }));

      triggerWebPushAndBanner(
        'Video Shared to Discussion!',
        params.notifyCohort
          ? `Your video is live in Discussion and all ${students.length} students have been notified.`
          : 'Your video has been posted to Discussion.',
        'DAILY_LESSON'
      );
    },
    [currentStudent, students.length, updateStudent, upsertVideoShareInGroupFeed, triggerWebPushAndBanner]
  );

  const handleMarkVideoDone = (
    videoId: string,
    videoUrl: string,
    options?: { shareToGroup?: boolean; groupNote?: string }
  ) => {
    const todayISO = getTodayDateISO();
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });

    let wasResubmission = false;
    let nextStreak = currentStudent.streakDays;
    const shouldShareToGroup = options?.shareToGroup ?? true;
    const deterministicPostId = `group-video-${currentStudent.id}-SUPPORTING-${videoId}`;

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
          : `🎬 Submitted verified link for ${videoLabel}${
              shouldShareToGroup ? ' (Shared to Discussion)' : ''
            } — ${videoUrl}`,
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
                coachReviewStatus: 'Pending Review',
                sharedToGroup: shouldShareToGroup || v.sharedToGroup,
                groupPostId: shouldShareToGroup ? deterministicPostId : v.groupPostId
              }
            : v
        ),
        messages: [...st.messages, submissionMsg]
      };
    });

    if (shouldShareToGroup) {
      upsertVideoShareInGroupFeed({
        student: currentStudent,
        videoType: 'SUPPORTING',
        videoId,
        videoUrl,
        note: options?.groupNote,
        coachReviewStatus: 'Pending Review',
        notifyCohort: true
      });
    }

    triggerWebPushAndBanner(
      wasResubmission
        ? 'Revised Video Link Sent to Coach!'
        : shouldShareToGroup
        ? 'Video Verified & Shared to Discussion!'
        : 'Daily Video Link Verified!',
      wasResubmission
        ? `Your updated link (${videoUrl}) is back in Coach Josh's Review Queue.`
        : shouldShareToGroup
        ? `Posted to Discussion (notified all students) + queued for Coach Josh's review! Streak: ${nextStreak}d.`
        : `Your social link (${videoUrl}) has been queued for Coach Review and your streak is now ${nextStreak} days.`,
      'DAILY_LESSON'
    );

    const submittedVid = currentStudent.supportingVideos.find(v => v.id === videoId);
    triggerGhlWebhook(
      {
        event: 'STUDENT_VIDEO_SUBMITTED',
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        studentEmail: currentStudent.email,
        studentCompany: currentStudent.company,
        recipientRole: 'COACH',
        coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
        subject: `${currentStudent.name} submitted ${
          submittedVid ? `Day #${submittedVid.dayNumber}: ${submittedVid.title}` : 'Daily Video'
        }`,
        message:
          options?.groupNote ||
          `${currentStudent.name} submitted a video link for Coach review: ${videoUrl}`,
        videoTitle: submittedVid
          ? `Day #${String(submittedVid.dayNumber).padStart(2, '0')}: ${submittedVid.title}`
          : 'Daily Video',
        videoUrl
      },
      appSettings.ghlWebhookUrl
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
    scriptDraft?: { S: string; H: string; I: string; F: string; T: string },
    options?: { shareToGroup?: boolean }
  ) => {
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
    const isScriptDraftOnlyEdit = scriptDraft !== undefined;
    const shouldShareCore = Boolean(
      !isScriptDraftOnlyEdit && status === 'Completed' && url && (options?.shareToGroup ?? true)
    );
    const deterministicPostId = `group-video-${currentStudent.id}-CORE-${coreId}`;

    updateStudent(currentStudent.id, st => {
      const existingCore = st.coreVideos.find(c => c.id === coreId);
      const wasCompleted = existingCore?.status === 'Completed';
      const isNewlyCompleted = !isScriptDraftOnlyEdit && status === 'Completed' && !wasCompleted;
      const isResubmittingCompleted =
        !isScriptDraftOnlyEdit &&
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
                  !isScriptDraftOnlyEdit && status === 'Completed'
                    ? 'Pending Review'
                    : c.coachReviewStatus,
                sharedToGroup: shouldShareCore || c.sharedToGroup,
                groupPostId: shouldShareCore ? deterministicPostId : c.groupPostId
              }
            : c
        ),
        messages: updatedMessages
      };
    });

    if (shouldShareCore && url) {
      upsertVideoShareInGroupFeed({
        student: currentStudent,
        videoType: 'CORE',
        videoId: coreId,
        videoUrl: url,
        coachReviewStatus: 'Pending Review',
        notifyCohort: true
      });
    }

    if (!isScriptDraftOnlyEdit && status === 'Completed' && url) {
      triggerWebPushAndBanner(
        shouldShareCore
          ? 'Core Video Submitted & Shared to Discussion!'
          : 'Core Brand Video Submitted!',
        shouldShareCore
          ? `Your Core Brand Video (${url}) is live in Discussion and queued for Coach Review.`
          : `Your Core Brand Video link (${url}) has been queued for Coach Review.`,
        'DAILY_LESSON'
      );

      const coreVid = currentStudent.coreVideos.find(c => c.id === coreId);
      triggerGhlWebhook(
        {
          event: 'STUDENT_VIDEO_SUBMITTED',
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          studentEmail: currentStudent.email,
          studentCompany: currentStudent.company,
          recipientRole: 'COACH',
          coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
          subject: `${currentStudent.name} submitted Core Video ${
            coreVid ? `${coreVid.code}: ${coreVid.name}` : coreId
          }`,
          message: `${currentStudent.name} submitted Core Brand Video link for review: ${url}`,
          videoTitle: coreVid ? `${coreVid.code}: ${coreVid.name}` : coreId,
          videoUrl: url
        },
        appSettings.ghlWebhookUrl
      );
    }
  };

  const handleReviewStudentVideo = (
    studentId: string,
    videoType: 'SUPPORTING' | 'CORE',
    videoId: string,
    reviewStatus: CoachReviewStatus,
    feedback: string,
    appendToGroupThread = true,
    coachVideoUrl?: string
  ) => {
    const reviewedTime = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const deterministicPostId = `group-video-${studentId}-${videoType}-${videoId}`;

    let resolvedVideoLabel = 'Video';

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
                  coachVideoUrl: coachVideoUrl || v.coachVideoUrl,
                  coachReviewedAt: reviewedTime,
                  sharedToGroup: appendToGroupThread ? true : v.sharedToGroup,
                  groupPostId: appendToGroupThread ? deterministicPostId : v.groupPostId
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
                  coachVideoUrl: coachVideoUrl || c.coachVideoUrl,
                  coachReviewedAt: reviewedTime,
                  sharedToGroup: appendToGroupThread ? true : c.sharedToGroup,
                  groupPostId: appendToGroupThread ? deterministicPostId : c.groupPostId
                };
              }
              return c;
            })
          : st.coreVideos;

      resolvedVideoLabel = videoLabel;
      const statusPrefix = reviewStatus === 'Approved' ? '✓ APPROVED' : '↻ REVISION REQUESTED';
      const noteMsg: ChatMessage = {
        id: `msg-review-${Date.now()}`,
        senderRole: 'COACH',
        senderName: 'Coach Josh Beechraft',
        text: `[${statusPrefix}] ${videoLabel}${feedback ? ` — "${feedback}"` : ''}${
          appendToGroupThread ? ' (Also appended to Discussion Thread)' : ''
        }`,
        timestamp: reviewedTime,
        relatedVideoTitle: videoLabel,
        isAlert: reviewStatus === 'Needs Revision',
        readByCoach: true,
        readByStudent: false,
        actionTarget: appendToGroupThread
          ? {
              label: 'View Breakdown in Discussion',
              tab: 'GROUP',
              groupPostId: deterministicPostId
            }
          : videoType === 'SUPPORTING'
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

    const recipient = latestStudentsRef.current.find(s => s.id === studentId);

    // Append Coach Josh's feedback to the Discussion thread (and create the thread if appendToGroupThread is enabled)
    if (recipient) {
      const existingThread = latestGroupPostsRef.current.find(
        p =>
          p.id === deterministicPostId ||
          (p.type === 'VIDEO_SHARE' &&
            p.studentId === studentId &&
            p.videoType === videoType &&
            p.videoId === videoId)
      );

      if (appendToGroupThread || existingThread) {
        upsertVideoShareInGroupFeed({
          student: recipient,
          videoType,
          videoId,
          coachReviewStatus: reviewStatus,
          coachFeedback: feedback,
          coachReviewedAt: reviewedTime,
          notifyCohort: false
        });

        broadcastCohortGroupNotification({
          senderName: 'Coach Josh Beechraft',
          text: `💬 Coach Josh appended feedback on ${recipient.name}’s video (${resolvedVideoLabel}): "${
            feedback || reviewStatus
          }" — Jump into Discussion to read & reply!`,
          relatedVideoTitle: resolvedVideoLabel,
          groupPostId: existingThread?.id || deterministicPostId,
          actionLabel: 'Read Feedback & Discuss'
        });
      }
    }

    triggerWebPushAndBanner(
      `Review Sent & Appended to Discussion (${reviewStatus})`,
      feedback || `Marked video as ${reviewStatus} and updated Discussion Thread.`,
      reviewStatus === 'Needs Revision' ? 'MISSED_ALERT' : 'COACH_NUDGE'
    );

    if (recipient) {
      triggerGhlWebhook(
        {
          event: 'COACH_VIDEO_REVIEW',
          studentId: recipient.id,
          studentName: recipient.name,
          studentEmail: recipient.email,
          studentCompany: recipient.company,
          recipientRole: 'STUDENT',
          coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
          subject: `Coach Josh reviewed your video (${resolvedVideoLabel}): ${reviewStatus}`,
          message:
            feedback ||
            `Coach Josh marked ${resolvedVideoLabel} as ${reviewStatus}.`,
          videoTitle: resolvedVideoLabel,
          reviewDecision: reviewStatus,
          coachVideoUrl
        },
        appSettings.ghlWebhookUrl
      );
    }
  };

  // Discussion Handlers
  const handleCreateGeneralGroupPost = (params: {
    title: string;
    body: string;
    category: GroupDiscussionCategory;
    videoUrl?: string;
    notifyCohort: boolean;
  }) => {
    const isCoach = authSession.role === 'ADMIN';
    const formattedStamp = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const newPostId = `group-thread-${Date.now()}`;
    const authorName = isCoach ? 'Coach Josh Beechraft' : currentStudent.name;

    const newPost: GroupDiscussionPost = {
      id: newPostId,
      type: 'GENERAL_THREAD',
      category: params.category,
      authorId: isCoach ? 'coach-josh' : currentStudent.id,
      authorName,
      authorAvatar: isCoach ? 'JB' : currentStudent.avatar,
      authorCompany: isCoach ? '2mmShift / Market Concussion' : currentStudent.company,
      authorNiche: isCoach ? '2mmShift Architect' : currentStudent.niche,
      authorRole: isCoach ? 'COACH' : 'STUDENT',
      title: params.title,
      body: params.body,
      timestamp: formattedStamp,
      createdAtISO: new Date().toISOString(),
      videoUrl: params.videoUrl,
      reactions: {
        fire: [],
        shift: [],
        props: []
      },
      comments: []
    };

    saveGroupPosts(prev => [newPost, ...prev]);

    if (params.notifyCohort) {
      broadcastCohortGroupNotification({
        excludeStudentId: isCoach ? undefined : currentStudent.id,
        senderName: authorName,
        text: `💬 ${authorName} started a new Discussion: "${params.title}"`,
        groupPostId: newPostId,
        actionLabel: 'Join Discussion'
      });
    }

    triggerWebPushAndBanner(
      'Discussion Thread Posted!',
      params.notifyCohort
        ? `"${params.title}" is live in Discussion and all students have been notified.`
        : `"${params.title}" is now live in Discussion.`,
      'DAILY_LESSON'
    );
  };

  const handleAddGroupComment = (postId: string, text: string) => {
    const isCoach = authSession.role === 'ADMIN';
    const formattedStamp = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const authorName = isCoach ? 'Coach Josh Beechraft' : currentStudent.name;

    const newComment: GroupDiscussionComment = {
      id: `group-comment-${Date.now()}`,
      authorId: isCoach ? 'coach-josh' : currentStudent.id,
      authorName,
      authorAvatar: isCoach ? 'JB' : currentStudent.avatar,
      authorCompany: isCoach ? '2mmShift Architect' : currentStudent.company,
      authorRole: isCoach ? 'COACH' : 'STUDENT',
      text,
      timestamp: formattedStamp,
      createdAtISO: new Date().toISOString()
    };

    const targetPost = groupPosts.find(p => p.id === postId);

    saveGroupPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p))
    );

    if (targetPost) {
      broadcastCohortGroupNotification({
        excludeStudentId: isCoach ? undefined : currentStudent.id,
        senderName: authorName,
        text: `↩ ${authorName} replied in "${targetPost.title}": "${text}"`,
        groupPostId: postId,
        actionLabel: 'View Thread Reply'
      });
    }
  };

  const handleToggleGroupReaction = (postId: string, reaction: 'fire' | 'shift' | 'props') => {
    const viewerId = authSession.role === 'ADMIN' ? 'coach-josh' : currentStudent.id;
    saveGroupPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const list = p.reactions[reaction] || [];
        const exists = list.includes(viewerId);
        const nextList = exists ? list.filter(id => id !== viewerId) : [...list, viewerId];
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [reaction]: nextList
          }
        };
      })
    );
  };

  const handleTogglePinGroupPost = (postId: string) => {
    saveGroupPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, pinned: !p.pinned } : p))
    );
  };

  const handleDeleteGroupPost = (postId: string) => {
    saveGroupPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Vault & Calls Handlers
  const handleUpdateUpcomingCall = (updated: UpcomingCoachingCall) => {
    setUpcomingCall(updated);
    try {
      localStorage.setItem(UPCOMING_CALL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    triggerWebPushAndBanner(
      'Upcoming Call Updated',
      `Next Live Call set to ${updated.dateTimeLabel}.`,
      'DAILY_LESSON'
    );
  };

  const handleSubmitHotSeatQuestion = (question: string, videoUrl?: string) => {
    const newQ = {
      id: `hs-${Date.now()}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      studentAvatar: currentStudent.avatar,
      question,
      videoUrl,
      timestamp: 'Just now',
      answered: false
    };
    const updated: UpcomingCoachingCall = {
      ...upcomingCall,
      hotSeatQuestions: [newQ, ...upcomingCall.hotSeatQuestions]
    };
    setUpcomingCall(updated);
    try {
      localStorage.setItem(UPCOMING_CALL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    triggerWebPushAndBanner(
      'Hot-Seat Question Submitted!',
      'Added your question to the live coaching call queue.',
      'DAILY_LESSON'
    );
  };

  const handleToggleHotSeatAnswered = (questionId: string) => {
    const updated: UpcomingCoachingCall = {
      ...upcomingCall,
      hotSeatQuestions: upcomingCall.hotSeatQuestions.map(q =>
        q.id === questionId ? { ...q, answered: !q.answered } : q
      )
    };
    setUpcomingCall(updated);
    try {
      localStorage.setItem(UPCOMING_CALL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddReplay = (replay: Omit<CoachingCallReplay, 'id'>) => {
    const created: CoachingCallReplay = {
      ...replay,
      id: `replay-${Date.now()}`
    };
    const next = [created, ...callReplays];
    setCallReplays(next);
    try {
      localStorage.setItem(CALL_REPLAYS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    broadcastCohortGroupNotification({
      senderName: 'Coach Josh Beechraft',
      text: `🎥 New Group Coaching Call Replay Posted: "${created.title}" — Watch the timestamped breakdown in Vault & Calls!`,
      actionLabel: 'Watch Call Replay'
    });
    triggerWebPushAndBanner(
      'Call Replay Published!',
      `"${created.title}" is now live in Vault & Calls.`,
      'DAILY_LESSON'
    );
  };

  const handleDeleteReplay = (replayId: string) => {
    const next = callReplays.filter(r => r.id !== replayId);
    setCallReplays(next);
    try {
      localStorage.setItem(CALL_REPLAYS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleToggleWatchedReplay = (replayId: string) => {
    updateStudent(currentStudent.id, st => {
      const current = st.watchedReplayIds || [];
      const exists = current.includes(replayId);
      const next = exists ? current.filter(id => id !== replayId) : [...current, replayId];
      const existingProg = st.replayProgress?.[replayId];
      const nextProgress = {
        ...(st.replayProgress || {}),
        [replayId]: {
          percent: exists ? 0 : 100,
          currentTimeSeconds: exists ? 0 : existingProg?.durationSeconds || 0,
          durationSeconds: existingProg?.durationSeconds || 0,
          updatedAtISO: new Date().toISOString()
        }
      };
      return {
        ...st,
        watchedReplayIds: next,
        replayProgress: nextProgress
      };
    });
  };

  const handleUpdateReplayProgress = useCallback(
    (
      replayId: string,
      currentTimeSeconds: number,
      durationSeconds: number,
      explicitPercent?: number
    ) => {
      updateStudent(currentStudent.id, st => {
        const prevProg = st.replayProgress?.[replayId];
        const effectiveDuration = Math.round(durationSeconds || prevProg?.durationSeconds || 0);
        const rawPercent =
          explicitPercent !== undefined
            ? explicitPercent
            : effectiveDuration > 0
            ? Math.round((currentTimeSeconds / effectiveDuration) * 100)
            : prevProg?.percent || 0;
        const clampedPercent = Math.min(100, Math.max(0, rawPercent));
        const currentWatched = st.watchedReplayIds || [];
        const isAlreadyWatched = currentWatched.includes(replayId);
        const isCompleted = isAlreadyWatched || clampedPercent >= 95;
        const nextWatched =
          isCompleted && !isAlreadyWatched ? [...currentWatched, replayId] : currentWatched;

        return {
          ...st,
          watchedReplayIds: nextWatched,
          replayProgress: {
            ...(st.replayProgress || {}),
            [replayId]: {
              percent: isCompleted ? 100 : clampedPercent,
              currentTimeSeconds: Math.round(currentTimeSeconds),
              durationSeconds: effectiveDuration,
              updatedAtISO: new Date().toISOString()
            }
          }
        };
      });
    },
    [currentStudent.id, updateStudent]
  );

  const handleAskReplayQuestion = (params: {
    replayId: string;
    replayTitle: string;
    videoUrl: string;
    timestampSeconds: number;
    timestampLabel: string;
    question: string;
  }): string => {
    const isCoach = authSession.role === 'ADMIN';
    const formattedStamp = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    const newPostId = `group-replay-q-${Date.now()}`;
    const authorName = isCoach ? 'Coach Josh Beechraft' : currentStudent.name;
    const baseVideoUrl = params.videoUrl.replace(/#t=.*$/i, '').trim();
    const safeSec = Math.max(0, Math.floor(params.timestampSeconds || 0));
    const timestampedUrl = `${baseVideoUrl}#t=${safeSec}s`;
    const postTitle = `Question on "${params.replayTitle}" (@ ${params.timestampLabel})`;

    const newPost: GroupDiscussionPost = {
      id: newPostId,
      type: 'GENERAL_THREAD',
      category: 'VIDEO_BREAKDOWN',
      authorId: isCoach ? 'coach-josh' : currentStudent.id,
      authorName,
      authorAvatar: isCoach ? 'JB' : currentStudent.avatar,
      authorCompany: isCoach ? '2mmShift / Market Concussion' : currentStudent.company,
      authorNiche: isCoach ? '2mmShift Architect' : currentStudent.niche,
      authorRole: isCoach ? 'COACH' : 'STUDENT',
      title: postTitle,
      body: params.question,
      timestamp: formattedStamp,
      createdAtISO: new Date().toISOString(),
      videoUrl: timestampedUrl,
      reactions: {
        fire: [],
        shift: [],
        props: []
      },
      comments: []
    };

    saveGroupPosts(prev => [newPost, ...prev]);

    // 1. Broadcast to the cohort group and notify Coach Josh directly in the student's message thread
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });

    const updatedList = latestStudentsRef.current.map(st => {
      const isAskingStudent = st.id === currentStudent.id;
      const msg: ChatMessage = isAskingStudent
        ? {
            id: `msg-replay-q-coach-${Date.now()}`,
            senderRole: isCoach ? 'COACH' : 'STUDENT',
            senderName: authorName,
            text: `❓ Question on "${params.replayTitle}" at ${params.timestampLabel}: "${params.question}"`,
            timestamp: formattedTime,
            relatedVideoTitle: `${params.replayTitle} (@ ${params.timestampLabel})`,
            isAlert: !isCoach,
            readByStudent: true,
            readByCoach: isCoach,
            actionTarget: {
              label: 'Watch @ Timestamp & Reply in Group',
              tab: 'GROUP',
              groupPostId: newPostId
            }
          }
        : {
            id: `msg-replay-q-peer-${Date.now()}-${st.id}`,
            senderRole: 'SYSTEM',
            senderName: `Discussion · ${authorName}`,
            text: `❓ ${authorName} asked a question on "${params.replayTitle}" (@ ${params.timestampLabel}): "${params.question}"`,
            timestamp: formattedTime,
            relatedVideoTitle: `${params.replayTitle} (@ ${params.timestampLabel})`,
            readByStudent: false,
            readByCoach: true,
            actionTarget: {
              label: 'Watch @ Timestamp & Discuss',
              tab: 'GROUP',
              groupPostId: newPostId
            }
          };

      return {
        ...st,
        messages: [...st.messages, msg]
      };
    });

    latestStudentsRef.current = updatedList;
    setStudents(updatedList);
    if (isSupabaseConfigured) {
      upsertStudentsToSupabase(updatedList);
    }

    triggerWebPushAndBanner(
      'Question Posted & Coach Notified!',
      `Posted your question (@ ${params.timestampLabel}) to Group Discussion and notified Coach Josh.`,
      'COACH_NUDGE'
    );

    triggerGhlWebhook(
      {
        event: 'STUDENT_VIDEO_QUESTION',
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        studentEmail: currentStudent.email,
        studentCompany: currentStudent.company,
        recipientRole: 'COACH',
        coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
        subject: `${currentStudent.name} asked a question on "${params.replayTitle}" (@ ${params.timestampLabel})`,
        message: params.question,
        videoTitle: params.replayTitle,
        videoUrl: timestampedUrl,
        videoTimestamp: params.timestampLabel
      },
      appSettings.ghlWebhookUrl
    );

    return newPostId;
  };

  const handleAddResource = (resource: Omit<CoachingResourceItem, 'id'>) => {
    const created: CoachingResourceItem = {
      ...resource,
      id: `res-${Date.now()}`
    };
    const next = [created, ...resources];
    setResources(next);
    try {
      localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    triggerWebPushAndBanner(
      'Resource Added to Vault!',
      `"${created.title}" is now available in Tools & Downloads.`,
      'DAILY_LESSON'
    );
  };

  const handleDeleteResource = (resourceId: string) => {
    const next = resources.filter(r => r.id !== resourceId);
    setResources(next);
    try {
      localStorage.setItem(RESOURCES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleSubmitWeeklyCheckIn = (
    checkIn: Omit<WeeklyScorecardCheckIn, 'id' | 'dateISO'>
  ) => {
    const todayISO = getTodayDateISO();
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
    const entry: WeeklyScorecardCheckIn = {
      ...checkIn,
      id: `checkin-${Date.now()}`,
      dateISO: todayISO
    };

    updateStudent(currentStudent.id, st => {
      const checkInMsg: ChatMessage = {
        id: `msg-checkin-${Date.now()}`,
        senderRole: 'STUDENT',
        senderName: st.name,
        text: `📊 ${checkIn.weekLabel}: ${checkIn.videosPosted} Videos Posted · ${checkIn.dmConversationsStarted} New DMs · ${checkIn.callsOrDealsBooked} Offer Docs/Wins — Bottleneck: "${checkIn.bottleneckNote}"`,
        timestamp: formattedTime,
        readByStudent: true,
        readByCoach: false,
        actionTarget: {
          label: 'View Operator Scorecard',
          tab: 'VAULT',
          vaultSubTab: 'SCORECARD'
        }
      };

      return {
        ...st,
        dmConversationsWeekly: checkIn.dmConversationsStarted,
        weeklyCheckIns: [entry, ...(st.weeklyCheckIns || [])],
        messages: [...st.messages, checkInMsg]
      };
    });

    triggerWebPushAndBanner(
      'Weekly Check-In Logged!',
      `Sent your ${checkIn.weekLabel} numbers & bottleneck note to Coach Josh.`,
      'DAILY_LESSON'
    );
  };

  const applyWorksheetUpdatesWithCoreSync = (
    st: StudentProfile,
    worksheetUpdates: Record<string, string>
  ): { worksheetAnswers: Record<string, string>; coreVideos: StudentProfile['coreVideos'] } => {
    const nextWorksheetAnswers = {
      ...st.worksheetAnswers,
      ...worksheetUpdates
    };

    let nextCoreVideos = st.coreVideos;
    for (const [fieldId, value] of Object.entries(worksheetUpdates)) {
      const coreMatch = fieldId.match(
        /^(l10_doc|l11_prod|l12_proof|l13_owner)_m(08_[shift]|12_thumb_cta)$/
      );
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

        nextCoreVideos = nextCoreVideos.map(cv => {
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
    }

    return {
      worksheetAnswers: nextWorksheetAnswers,
      coreVideos: nextCoreVideos
    };
  };

  const handleToggleTask = (lessonNumber: number, taskIdx: number, targetStudentId?: string) => {
    const key = `${lessonNumber}-${taskIdx}`;
    const studentId = targetStudentId || currentStudent.id;
    updateStudent(studentId, st => ({
      ...st,
      tasksCompleted: {
        ...st.tasksCompleted,
        [key]: !st.tasksCompleted[key]
      }
    }));
  };

  const handleUpdateField = (fieldId: string, value: string) => {
    updateStudent(currentStudent.id, st => {
      const synced = applyWorksheetUpdatesWithCoreSync(st, { [fieldId]: value });
      return {
        ...st,
        ...synced
      };
    });
  };

  const handleSyncShiftMagnetFromLesson21 = () => {
    updateStudent(currentStudent.id, st => {
      const ans = st.worksheetAnswers;
      const workingTitle = (ans['m16_magnet_title'] || '').trim() || 'Custom Shift Magnet';
      const keywordRaw = (ans['m16_keyword'] || ans['m16_version'] || 'SHIFT')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '');
      const keywordTrigger =
        keywordRaw.length >= 2 && keywordRaw.length <= 16 && !/^V\d+$/i.test(keywordRaw)
          ? keywordRaw
          : 'SHIFT';

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

    triggerGhlWebhook(
      {
        event: 'STUDENT_GATE_SUBMITTED',
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        studentEmail: currentStudent.email,
        studentCompany: currentStudent.company,
        recipientRole: 'COACH',
        coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
        subject: `${currentStudent.name} submitted Phase 0${phaseNumber} Gate for Coach Sign-Off`,
        message: `${currentStudent.name} completed Lesson ${gateLessonNum} and submitted Phase 0${phaseNumber} Gate.`,
        phaseNumber,
        lessonNumber: gateLessonNum
      },
      appSettings.ghlWebhookUrl
    );
  };

  const handleAddShiftMagnet = (magnet: ShiftMagnet) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      shiftMagnets: [magnet, ...st.shiftMagnets]
    }));
    triggerWebPushAndBanner(
      `Shift Magnet Created: "${magnet.workingTitle}"`,
      `Keyword "${magnet.keywordTrigger}" is now available in your Studio Step 2 CTA dropdown and DM Playbook.`,
      'DAILY_LESSON'
    );
  };

  const handleUpdateShiftMagnet = (id: string, updates: Partial<ShiftMagnet>) => {
    updateStudent(currentStudent.id, st => ({
      ...st,
      shiftMagnets: st.shiftMagnets.map(m => (m.id === id ? { ...m, ...updates } : m))
    }));
  };

  const handleDeleteShiftMagnet = (id: string) => {
    updateStudent(currentStudent.id, st => {
      const remaining = st.shiftMagnets.filter(m => m.id !== id);
      const fallbackId = remaining[0]?.id;
      return {
        ...st,
        shiftMagnets: remaining,
        supportingVideos: st.supportingVideos.map(v =>
          v.attachedMagnetId === id ? { ...v, attachedMagnetId: fallbackId } : v
        )
      };
    });
    triggerWebPushAndBanner(
      'Shift Magnet Removed',
      'Deleted Shift Magnet and updated any attached Studio video CTAs.',
      'DAILY_LESSON'
    );
  };

  const handleAssignShiftMagnetToPendingVideos = (magnetId: string) => {
    const targetMag = currentStudent.shiftMagnets.find(m => m.id === magnetId);
    updateStudent(currentStudent.id, st => ({
      ...st,
      supportingVideos: st.supportingVideos.map(v =>
        v.status !== 'Completed' ? { ...v, attachedMagnetId: magnetId } : v
      )
    }));
    if (targetMag) {
      triggerWebPushAndBanner(
        `Default Studio CTA Updated`,
        `Assigned "${targetMag.workingTitle}" (Keyword: ${targetMag.keywordTrigger}) to all upcoming Daily Concussion Content videos.`,
        'DAILY_LESSON'
      );
    }
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

    triggerGhlWebhook(
      {
        event: isCoachSender ? 'COACH_NUDGE' : 'STUDENT_DIRECT_MESSAGE',
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        studentEmail: targetStudent.email,
        studentCompany: targetStudent.company,
        recipientRole: isCoachSender ? 'STUDENT' : 'COACH',
        coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
        subject: isCoachSender
          ? `New message from Coach Josh Beechraft`
          : `New message from ${targetStudent.name}`,
        message: text
      },
      appSettings.ghlWebhookUrl
    );
  };

  const handleBroadcastCoachMessage = (text: string) => {
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });

    const updatedList = latestStudentsRef.current.map(st => {
      const broadcastMsg: ChatMessage = {
        id: `msg-broadcast-${Date.now()}-${st.id}`,
        senderRole: 'COACH',
        senderName: 'Coach Josh Beechraft · Broadcast',
        text,
        timestamp: formattedTime,
        readByCoach: true,
        readByStudent: false,
        actionTarget: {
          label: 'Open Vault & Calls',
          tab: 'VAULT',
          vaultSubTab: 'CALLS'
        }
      };

      triggerGhlWebhook(
        {
          event: 'COACH_BROADCAST',
          studentId: st.id,
          studentName: st.name,
          studentEmail: st.email,
          studentCompany: st.company,
          recipientRole: 'STUDENT',
          coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
          subject: 'Announcement from Coach Josh Beechraft',
          message: text
        },
        appSettings.ghlWebhookUrl
      );

      return {
        ...st,
        messages: [...st.messages, broadcastMsg]
      };
    });

    latestStudentsRef.current = updatedList;
    setStudents(updatedList);
    if (isSupabaseConfigured) {
      upsertStudentsToSupabase(updatedList);
    }

    triggerWebPushAndBanner(
      `Broadcast Sent to All ${updatedList.length} Operators`,
      `"${text}"`,
      'COACH_NUDGE'
    );
  };

  const handleTestGhlWebhook = async (webhookUrl?: string) => {
    return triggerGhlWebhook(
      {
        event: 'GHL_WEBHOOK_TEST',
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        studentEmail: currentStudent.email || 'student@example.com',
        studentCompany: currentStudent.company,
        recipientRole: 'STUDENT',
        coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
        subject: 'Test Notification from 2mm Shift Coaching Portal',
        message:
          'This is a live test payload from the Market Concussion / 2mm Shift Portal. Map these fields in your GoHighLevel workflow!',
        videoTitle: 'Day #01: Sample Concussion Video',
        videoUrl: 'https://vimeo.com/76979871#t=125s',
        videoTimestamp: '02:05',
        reviewDecision: 'Approved',
        phaseNumber: currentStudent.currentPhase,
        lessonNumber: currentStudent.currentWeek
      },
      webhookUrl || appSettings.ghlWebhookUrl
    );
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

    triggerGhlWebhook(
      {
        event: 'COACH_NUDGE',
        studentId: missedStudent.id,
        studentName: missedStudent.name,
        studentEmail: missedStudent.email,
        studentCompany: missedStudent.company,
        recipientRole: 'STUDENT',
        coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
        subject: `Daily Video Check-In from Coach Josh`,
        message: alertMsg.text,
        videoTitle: nextPendingVideo
          ? `Day #${String(nextPendingVideo.dayNumber).padStart(2, '0')}: ${nextPendingVideo.title}`
          : 'Today’s Video'
      },
      appSettings.ghlWebhookUrl
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

    if (target) {
      triggerGhlWebhook(
        {
          event: 'COACH_GATE_REVIEW',
          studentId: target.id,
          studentName: target.name,
          studentEmail: target.email,
          studentCompany: target.company,
          recipientRole: 'STUDENT',
          coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
          subject: `Phase 0${phaseNum} Gate Approved by Coach Josh!`,
          message: `You are officially cleared for Phase 0${nextPhase} (Lesson ${nextPhaseStartLesson}).`,
          reviewDecision: 'APPROVED',
          phaseNumber: phaseNum,
          lessonNumber: nextPhaseStartLesson
        },
        appSettings.ghlWebhookUrl
      );
    }
  };

  const handleRequestGateRevision = (studentId: string, phaseNum: number, feedback?: string) => {
    const formattedTime = new Date().toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
    const gateLessonNum =
      phaseNum === 1 ? 4 : phaseNum === 2 ? 8 : phaseNum === 3 ? 18 : phaseNum === 4 ? 22 : 26;

    updateStudent(studentId, st => {
      const revisionMsg: ChatMessage = {
        id: `msg-gate-revision-${Date.now()}`,
        senderRole: 'COACH',
        senderName: 'Coach Josh Beechraft',
        text: `↻ PHASE 0${phaseNum} GATE REVISION REQUESTED (Lesson ${String(gateLessonNum).padStart(
          2,
          '0'
        )})${feedback ? ` — "${feedback}"` : '. Please review the rubric items and resubmit when ready.'}`,
        timestamp: formattedTime,
        isAlert: true,
        readByCoach: true,
        readByStudent: false,
        actionTarget: {
          label: `Open Lesson ${String(gateLessonNum).padStart(2, '0')} Gate`,
          tab: 'WORKBOOK',
          lessonNumber: gateLessonNum
        }
      };

      return {
        ...st,
        currentPhase: Math.min(st.currentPhase, phaseNum),
        worksheetAnswers: {
          ...st.worksheetAnswers,
          [`phase_gate_status_${phaseNum}`]: 'OPEN'
        },
        gateStatus: {
          ...st.gateStatus,
          [phaseNum]: 'OPEN'
        },
        messages: [...st.messages, revisionMsg]
      };
    });

    const target = students.find(s => s.id === studentId);
    triggerWebPushAndBanner(
      `Phase 0${phaseNum} Gate Reopened`,
      `Sent revision request for Phase 0${phaseNum} Gate to ${target?.name || 'Student'}.`,
      'MISSED_ALERT'
    );

    if (target) {
      triggerGhlWebhook(
        {
          event: 'COACH_GATE_REVIEW',
          studentId: target.id,
          studentName: target.name,
          studentEmail: target.email,
          studentCompany: target.company,
          recipientRole: 'STUDENT',
          coachEmail: appSettings.adminEmails[0] || 'joshbmagic@gmail.com',
          subject: `Phase 0${phaseNum} Gate Revision Requested`,
          message:
            feedback ||
            `Please review the Phase 0${phaseNum} Gate rubric items in Lesson ${gateLessonNum} and resubmit when ready.`,
          reviewDecision: 'REVISION_REQUESTED',
          phaseNumber: phaseNum,
          lessonNumber: gateLessonNum
        },
        appSettings.ghlWebhookUrl
      );
    }
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
    } finally {
      e.target.value = '';
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

      const syncedWorksheetAndCore = worksheetUpdates
        ? applyWorksheetUpdatesWithCoreSync(st, worksheetUpdates)
        : { worksheetAnswers: st.worksheetAnswers, coreVideos: st.coreVideos };

      return {
        ...st,
        ...updates,
        avatar: initials,
        worksheetAnswers: syncedWorksheetAndCore.worksheetAnswers,
        coreVideos: updates.coreVideos !== undefined ? updates.coreVideos : syncedWorksheetAndCore.coreVideos
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

  const handleDeleteStudentVideo = (studentId: string, videoId: string) => {
    updateStudent(studentId, st => {
      if (st.supportingVideos.length <= 1) return st;
      const remaining = st.supportingVideos
        .filter(v => v.id !== videoId)
        .map((v, idx) => ({ ...v, dayNumber: idx + 1 }));
      return {
        ...st,
        supportingVideos: remaining
      };
    });
    saveGroupPosts(prev =>
      prev.filter(
        p => !((p.studentId === studentId || p.authorId === studentId) && p.videoId === videoId)
      )
    );
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
    saveGroupPosts(prev =>
      prev.filter(p => p.studentId !== studentId && p.authorId !== studentId)
    );
  };

  const handleLoginStudent = (studentId: string) => {
    const cleanStudentId = studentId.split('?')[0];
    const session: AuthSession = { role: 'STUDENT', studentId: cleanStudentId };
    setAuthSession(session);
    setActiveStudentId(cleanStudentId);

    const params = new URLSearchParams(window.location.search);
    const isOAuthReturnOrCrm = (() => {
      try {
        return Boolean(
          sessionStorage.getItem('outstand_pending_session') ||
            localStorage.getItem('outstand_oauth_pending') ||
            params.get('session') ||
            params.get('outstand_session') ||
            params.get('connected_network') ||
            params.get('tab')?.toUpperCase() === 'CRM' ||
            window.location.href.includes('session=')
        );
      } catch {
        return false;
      }
    })();

    setActiveTab(isOAuthReturnOrCrm ? 'CRM' : 'CADENCE');
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      if (!isOAuthReturnOrCrm) {
        window.history.pushState({}, '', `/student?student=${cleanStudentId}`);
      }
    } catch {
      // ignore
    }
  };

  const handleLoginAdmin = () => {
    const session: AuthSession = { role: 'ADMIN' };
    setAuthSession(session);
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
    ? currentStudent.messages.filter(
        m => (m.senderRole === 'STUDENT' || m.senderRole === 'SYSTEM') && m.readByCoach === false
      ).length
    : currentStudent.messages.filter(
        m => (m.senderRole === 'COACH' || m.senderRole === 'SYSTEM') && m.readByStudent === false
      ).length;

  const { crmThreadsCount, crmUnreadCount } = (() => {
    const raw = currentStudent.worksheetAnswers['dm_crm_threads_json'];
    const rawCfg = currentStudent.worksheetAnswers['outstand_config_json'];
    let activeIgId = '';
    try {
      if (rawCfg) activeIgId = JSON.parse(rawCfg)?.instagramAccountId || '';
    } catch {
      // ignore
    }
    if (!raw) return { crmThreadsCount: 0, crmUnreadCount: 0 };
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return { crmThreadsCount: 0, crmUnreadCount: 0 };
      const valid = parsed.filter(
        (t: {
          id?: string;
          outstandConversationId?: string | null;
          socialAccountId?: string | null;
          platform?: string;
        }) => {
          if (t.id === 'crm-starter-1' || t.outstandConversationId === 'conv_outstand_demo_01') {
            return false;
          }
          if (
            activeIgId &&
            (!t.platform || t.platform === 'instagram') &&
            t.socialAccountId &&
            t.socialAccountId !== activeIgId
          ) {
            return false;
          }
          return true;
        }
      );
      const unread = valid.reduce(
        (acc: number, t: { unreadCount?: number }) => acc + (t.unreadCount || 0),
        0
      );
      return { crmThreadsCount: valid.length, crmUnreadCount: unread };
    } catch {
      return { crmThreadsCount: 0, crmUnreadCount: 0 };
    }
  })();

  const allNavItems = [
    { id: 'CADENCE' as const, label: 'Studio', shortLabel: 'Studio', icon: Video, role: 'STUDENT' as const },
    { id: 'GROUP' as const, label: `Discussion (${groupPosts.length})`, shortLabel: 'Discussion', icon: Users, role: 'STUDENT' as const },
    { id: 'WORKBOOK' as const, label: 'Lessons 1–26', shortLabel: 'Lessons', icon: BookOpen, role: 'STUDENT' as const },
    { id: 'MAGNETS' as const, label: 'Shift Magnets', shortLabel: 'Magnets', icon: Magnet, role: 'STUDENT' as const },
    {
      id: 'CRM' as const,
      label: crmUnreadCount > 0 ? `Live DM CRM (${crmUnreadCount} new)` : `Live DM CRM (${crmThreadsCount})`,
      shortLabel: crmUnreadCount > 0 ? `CRM (${crmUnreadCount})` : 'DM CRM',
      icon: Radio,
      role: 'STUDENT' as const
    },
    {
      id: 'VAULT' as const,
      label: 'Vault & Calls',
      shortLabel: 'Vault',
      icon: FolderOpen,
      role: 'STUDENT' as const
    },
    { id: 'COACH' as const, label: 'Admin', shortLabel: 'Admin', icon: UserCheck, role: 'COACH' as const }
  ];

  const navItems = isAdminSession
    ? allNavItems
    : allNavItems.filter(item => item.role === 'STUDENT');

  return (
    <div className="min-h-dvh flex bg-[#080C14] text-slate-100">
      {/* Live Push Notification Toast Stack */}
      {pushBanners.length > 0 && (
        <div className="fixed bottom-20 md:bottom-5 right-3.5 md:right-5 z-50 w-[92vw] max-w-sm space-y-2.5">
          {pushBanners.map(b => (
            <div
              key={b.id}
              onClick={() => {
                if (b.threadId) {
                  setActiveTab('CRM');
                  setRequestedCrmThreadId(b.threadId);
                  setPushBanners(prev => prev.filter(x => x.id !== b.id));
                }
              }}
              className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex items-start justify-between gap-3 ${
                b.threadId ? 'cursor-pointer hover:border-brand-400' : ''
              } ${
                b.type === 'MISSED_ALERT'
                  ? 'border-rose-500/40 bg-[#14070B]/95 text-white'
                  : b.type === 'COACH_NUDGE'
                  ? 'border-brand-500/40 bg-[#0F1626]/95 text-white glow-cyan'
                  : 'border-emerald-500/40 bg-[#06130E]/95 text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-500/15 text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{b.title}</div>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{b.body}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setPushBanners(prev => prev.filter(x => x.id !== b.id));
                }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Minimal Left Navigation Rail (Desktop) */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-white/[0.08] bg-[#0A0F1D]/90 backdrop-blur-xl p-5 sticky top-0 h-dvh">
        <div className="space-y-7">
          {/* Official THE 2MM SHIFT Logo & JOSH BEECHRAFT Brand Header */}
          <div className="px-1 pt-1 space-y-2.5">
            <img
              src="/2mmshift-logo-wide.png"
              alt="The 2mm Shift"
              className="h-12 w-auto object-contain select-none"
            />
            <div className="flex items-center gap-2 pl-0.5">
              <span className="w-3.5 h-[1.5px] bg-brand-500" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
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
                    setActiveTab(item.id);
                    try {
                      if (item.id === 'COACH') {
                        window.history.pushState({}, '', '/admin');
                      } else {
                        window.history.pushState(
                          {},
                          '',
                          `/student?student=${currentStudent.id}&tab=${item.id}`
                        );
                      }
                    } catch {
                      // ignore
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2.5 text-xs font-bold tracking-wide cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-sky-500 text-white shadow-lg shadow-sky-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Active Profile Switcher (Admin Preview Mode Only) + Logout */}
        <div className="pt-4 border-t border-white/[0.08] space-y-2">
          {isAdminSession && activeTab !== 'COACH' && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1">
                Previewing Operator
              </span>
              <select
                value={activeStudentId}
                onChange={e => setActiveStudentId(e.target.value)}
                aria-label="Select active student profile"
                className="w-full rounded-xl bg-[#0F1626] border border-white/10 text-xs font-medium text-white px-3 py-2 focus:outline-none focus:border-brand-400"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-xs font-medium text-slate-400 hover:text-rose-300 active:scale-95 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Right Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky TopBar with Integrated Admin Preview & Profile Chip */}
        <header className="sticky top-0 z-40 bg-[#080C14]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 sm:px-8 pt-3 pb-3">
          <div className="max-w-5xl mx-auto">
            {/* Admin Preview Bar */}
            {isAdminSession && activeTab !== 'COACH' && (
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.04] text-[11px] font-medium text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Previewing <span className="text-white font-semibold">{currentStudent.name}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('COACH');
                    try {
                      window.history.pushState({}, '', '/admin');
                    } catch {
                      // ignore
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-500/15 border border-brand-400/30 text-brand-400 font-semibold text-[10px] uppercase tracking-wider hover:bg-brand-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M11 17l-5-5m0 0l5-5m-5 5h12"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Admin</span>
                </button>
              </div>
            )}

            {/* User & Quick Action Header */}
            <div className="flex items-center justify-between gap-2">
              {activeTab === 'COACH' ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src="/2mmshift-logo-wide.png"
                    alt="The 2mm Shift"
                    className="md:hidden h-7 w-auto object-contain shrink-0 select-none"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="hidden sm:inline-block w-3.5 h-[1.5px] bg-brand-500" />
                    <span className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                      Coach Command Center
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/15 text-brand-400 border border-brand-400/30 shrink-0">
                      {students.length} Operators
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center font-bold text-xs tracking-wider text-white shadow-sm ring-2 ring-white/10">
                      {currentStudent.avatar}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#080C14]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-white tracking-tight truncate">
                        {currentStudent.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-brand-400 border border-white/5 shrink-0">
                        L{String(currentStudent.currentWeek).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {currentStudent.company || 'Cohort Member'}
                    </p>
                  </div>
                </div>
              )}

              {/* Utility Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${
                    dbSyncStatus === 'SYNCED'
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                      : dbSyncStatus === 'SYNCING' || dbSyncStatus === 'CONNECTING'
                      ? 'bg-sky-500/10 border-sky-500/25 text-sky-300'
                      : 'bg-white/[0.04] border-white/10 text-slate-400'
                  }`}
                  title="Database synchronization status"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      dbSyncStatus === 'SYNCED'
                        ? 'bg-emerald-400'
                        : dbSyncStatus === 'SYNCING' || dbSyncStatus === 'CONNECTING'
                        ? 'bg-sky-400 animate-pulse'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span>
                    {dbSyncStatus === 'SYNCED'
                      ? 'Synced'
                      : dbSyncStatus === 'SYNCING'
                      ? 'Saving...'
                      : dbSyncStatus === 'CONNECTING'
                      ? 'Connecting...'
                      : 'Local'}
                  </span>
                </span>

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
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-medium text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Copy Link</span>
                  </button>
                )}

                {/* Messages / Notification Bell Button */}
                <button
                  type="button"
                  aria-label="Messages and Notifications"
                  onClick={() => setShowStudentInboxModal(true)}
                  className={`relative p-2 sm:px-3 sm:py-2 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    unreadMessagesForCurrentViewer > 0
                      ? 'bg-brand-500/15 border-brand-400/40 text-white glow-cyan'
                      : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-brand-400" />
                  <span className="hidden sm:inline text-xs font-medium">Messages</span>
                  {unreadMessagesForCurrentViewer > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white shadow-md">
                      {unreadMessagesForCurrentViewer}
                    </span>
                  ) : (
                    currentStudent.messages.length > 0 && (
                      <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold">
                        {currentStudent.messages.length}
                      </span>
                    )
                  )}
                </button>

                {/* Sign Out / Exit Icon */}
                <button
                  type="button"
                  aria-label="Sign Out"
                  onClick={handleLogout}
                  className="md:hidden p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace Canvas (Generous Bottom Padding for Mobile Fixed Nav) */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 pt-4 pb-28 md:pb-10">
          {activeTab === 'CADENCE' && (
            <DailyCadenceView
              student={currentStudent}
              onUpdateVideo={handleUpdateVideo}
              onMarkVideoDone={handleMarkVideoDone}
              onUpdatePillarStatus={handleUpdatePillarStatus}
              onUpdateCoreVideoStatus={handleUpdateCoreVideoStatus}
              onShareVideoToGroup={handleShareVideoToGroup}
              onOpenGroupThread={postId => {
                setActiveTab('GROUP');
                if (postId) setRequestedGroupPostId(postId);
              }}
              onQuickStartNavigate={targetTab => {
                setActiveTab(targetTab);
                if (targetTab === 'VAULT') {
                  setRequestedVaultSubTab('SCORECARD');
                }
              }}
              onDismissOnboarding={() => {
                updateStudent(currentStudent.id, st => ({ ...st, onboardingDismissed: true }));
              }}
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

          <Suspense
            fallback={
              <div className="py-16 text-center text-xs text-neutral-500">Loading workspace...</div>
            }
          >
            {activeTab === 'VAULT' && (
              <VaultAndCallsView
                student={currentStudent}
                isAdminSession={isAdminSession}
                upcomingCall={upcomingCall}
                replays={callReplays}
                resources={resources}
                requestedSubTab={requestedVaultSubTab}
                onClearRequestedSubTab={() => setRequestedVaultSubTab(undefined)}
                onUpdateUpcomingCall={handleUpdateUpcomingCall}
                onSubmitHotSeatQuestion={handleSubmitHotSeatQuestion}
                onToggleHotSeatAnswered={handleToggleHotSeatAnswered}
                onAddReplay={handleAddReplay}
                onDeleteReplay={handleDeleteReplay}
                onToggleWatchedReplay={handleToggleWatchedReplay}
                onUpdateReplayProgress={handleUpdateReplayProgress}
                onAskReplayQuestion={handleAskReplayQuestion}
                onOpenGroupThread={postId => {
                  setActiveTab('GROUP');
                  if (postId) setRequestedGroupPostId(postId);
                }}
                onAddResource={handleAddResource}
                onDeleteResource={handleDeleteResource}
                onSubmitWeeklyCheckIn={handleSubmitWeeklyCheckIn}
              />
            )}

            {activeTab === 'GROUP' && (
              <GroupDiscussionView
                students={students}
                currentStudent={currentStudent}
                isAdminSession={isAdminSession}
                posts={groupPosts}
                requestedPostId={requestedGroupPostId}
                onClearRequestedPostId={() => setRequestedGroupPostId(undefined)}
                onCreateGeneralPost={handleCreateGeneralGroupPost}
                onShareVideoToGroup={handleShareVideoToGroup}
                onAddComment={handleAddGroupComment}
                onToggleReaction={handleToggleGroupReaction}
                onTogglePinPost={handleTogglePinGroupPost}
                onDeletePost={handleDeleteGroupPost}
                onReviewStudentVideo={handleReviewStudentVideo}
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
                onUpdateReplayProgress={handleUpdateReplayProgress}
                onToggleWatchedReplay={handleToggleWatchedReplay}
                onAskLessonVideoQuestion={handleAskReplayQuestion}
                onOpenGroupThread={postId => {
                  setActiveTab('GROUP');
                  if (postId) setRequestedGroupPostId(postId);
                }}
                requestedLessonNumber={requestedLessonNumber}
                onClearRequestedLesson={() => setRequestedLessonNumber(undefined)}
              />
            )}

            {activeTab === 'MAGNETS' && (
              <ShiftMagnetsView
                student={currentStudent}
                onAddShiftMagnet={handleAddShiftMagnet}
                onUpdateShiftMagnet={handleUpdateShiftMagnet}
                onDeleteShiftMagnet={handleDeleteShiftMagnet}
                onAssignToPendingVideos={handleAssignShiftMagnetToPendingVideos}
                onUpdateField={handleUpdateField}
                onSyncFromLesson21={handleSyncShiftMagnetFromLesson21}
                onOpenLesson={lessonNum => {
                  setActiveTab('WORKBOOK');
                  setRequestedLessonNumber(lessonNum);
                }}
                onOpenLiveCrm={() => setActiveTab('CRM')}
              />
            )}

            {activeTab === 'CRM' && (
              <OutstandDmCrmPanel
                student={currentStudent}
                onUpdateField={handleUpdateField}
                onAddShiftMagnet={handleAddShiftMagnet}
                onUpdateShiftMagnet={handleUpdateShiftMagnet}
                onDeleteShiftMagnet={handleDeleteShiftMagnet}
                requestedThreadId={requestedCrmThreadId}
                onClearRequestedThreadId={() => setRequestedCrmThreadId(undefined)}
                onOpenMagnetsTab={() => setActiveTab('MAGNETS')}
                onTriggerCrmNotification={handleTriggerCrmNotification}
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
                onDeleteStudentVideo={handleDeleteStudentVideo}
                onDeleteStudent={handleDeleteStudent}
                onSendMessage={handleSendMessage}
                onBroadcastMessage={handleBroadcastCoachMessage}
                onTestGhlWebhook={handleTestGhlWebhook}
                onMarkMessagesRead={handleMarkMessagesRead}
                onNavigateFromChatAction={handleNavigateFromChatAction}
                onReviewStudentVideo={handleReviewStudentVideo}
                onTriggerMissedAlertPush={handleTriggerMissedAlertPush}
                onApproveGate={handleApproveGate}
                onRequestGateRevision={handleRequestGateRevision}
                onToggleStudentTask={(studentId, lessonNumber, taskIdx) =>
                  handleToggleTask(lessonNumber, taskIdx, studentId)
                }
                onOpenImportModal={() => {
                  setImportStatus(null);
                  setShowImportModal(true);
                }}
                onPreviewStudentDashboard={(studentId: string) => {
                  setActiveStudentId(studentId);
                  setActiveTab('CADENCE');
                  try {
                    window.history.pushState({}, '', `/student?student=${studentId}`);
                  } catch {
                    // ignore
                  }
                }}
              />
            )}
          </Suspense>
        </main>

        {/* Native-Style Fixed Bottom Navigation Bar for Mobile (< md) */}
        <nav
          aria-label="Bottom Navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0A0F1D]/90 backdrop-blur-xl border-t border-white/[0.08] px-3 py-2 pb-safe"
        >
          <div className="flex items-center justify-between max-w-md mx-auto text-slate-400">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    try {
                      if (item.id === 'COACH') {
                        window.history.pushState({}, '', '/admin');
                      } else {
                        window.history.pushState(
                          {},
                          '',
                          `/student?student=${activeStudentId}&tab=${item.id}`
                        );
                      }
                    } catch {
                      // ignore history errors
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex flex-col items-center gap-1 py-1 transition-all cursor-pointer active:scale-95 ${
                    isActive
                      ? 'px-3 rounded-xl bg-brand-500/15 border border-brand-400/30 text-brand-400 shadow-sm'
                      : 'px-2 rounded-lg text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span
                    className={`text-[10px] tracking-tight ${
                      isActive ? 'font-bold text-white' : 'font-medium'
                    }`}
                  >
                    {item.shortLabel}
                  </span>
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
            <code className="text-brand-400">josh_content_tracking-v2.xlsx</code>) to automatically populate or update:
          </p>
          <ul className="space-y-1.5 text-slate-300 list-disc pl-5">
            <li>
              <strong>Content Playbook:</strong> 15 Core Pillars, Old/New Beliefs, Must-Hit Beats, and 4 Teaching Angles.
            </li>
            <li>
              <strong>Concussion Content:</strong> 50 Daily Micro-Topics with Hooks 1, 2, and 3 (preserving any completed video links and coach reviews).
            </li>
          </ul>

          <label className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-500/40 hover:border-brand-400 bg-[#080C14] p-8 cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-brand-400 mb-2" />
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
              className="rounded-xl btn-2mm px-5 py-2.5 text-xs cursor-pointer"
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
          <div className="rounded-2xl bg-[#080C14] border border-white/[0.08] p-4 space-y-3 max-h-80 overflow-y-auto">
            {currentStudent.messages.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
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
                        ? 'border-brand-400/35 bg-brand-500/15 text-white ml-6'
                        : 'border-white/10 bg-white/[0.04] text-slate-100 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="text-brand-400 font-semibold">{m.senderName}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="leading-relaxed text-sm">{m.text}</p>
                    {m.actionTarget && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleNavigateFromChatAction(currentStudent.id, m.actionTarget!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 border border-brand-400/40 text-[11px] font-bold text-brand-400 cursor-pointer"
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
              className="flex-1 rounded-xl bg-[#080C14] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              className="rounded-xl btn-2mm text-xs px-5 py-3 flex items-center gap-1.5 cursor-pointer"
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
