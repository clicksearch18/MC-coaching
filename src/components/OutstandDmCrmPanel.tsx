import React, { useState, useMemo, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Search,
  Plus,
  Edit3,
  ArrowRight,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { StudentProfile, ShiftMagnet } from '../types';

export type ShiftCrmStage =
  | 'STAGE_S'
  | 'STAGE_H'
  | 'STAGE_I'
  | 'STAGE_F'
  | 'STAGE_T'
  | 'LOOP_DAY2'
  | 'LOOP_DAY5'
  | 'LOOP_DAY12'
  | 'LOOP_DAY30'
  | 'CLOSED_WON';

export interface DmCrmMessage {
  id: string;
  outstandMessageId?: string | null;
  direction: 'inbound_comment' | 'inbound_dm' | 'outbound_dm';
  text: string;
  stageTag?: string;
  createdAt: string;
  scheduledFor?: string | null;
  deliveryStatus?: 'sent' | 'delivered' | 'read' | 'scheduled' | 'simulated';
}

export interface DmCrmThread {
  id: string;
  outstandConversationId: string | null;
  socialAccountId: string | null;
  platform: 'instagram' | 'facebook' | 'linkedin';
  prospectHandle: string;
  prospectName: string;
  matchedKeyword: string;
  matchedMagnetId: string | null;
  matchedMagnetTitle: string;
  sourceCommentId: string | null;
  sourcePostId: string | null;
  stage: ShiftCrmStage;
  constraintPicked: string;
  windowOpen: boolean;
  lastUserReplyAt: string | null;
  scheduledFollowup: {
    outstandMessageId?: string | null;
    level: 'DAY_2' | 'DAY_5' | 'DAY_12' | 'DAY_30';
    scheduledAt: string;
    text: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
  messages: DmCrmMessage[];
}

export interface OutstandConnectedAccount {
  id: string;
  network: 'instagram' | 'facebook';
  username: string;
  name?: string;
}

export interface OutstandConfig {
  apiKey: string;
  socialAccountId: string;
  instagramAccountId?: string;
  instagramHandle: string;
  facebookAccountId?: string;
  facebookPageName?: string;
  connectedAccounts?: OutstandConnectedAccount[];
  tenantId: string;
  autoCommentToDm: boolean;
  combineStageSandH: boolean;
  triggerTestedAt?: string;
  lastSyncedAt?: string;
}

interface OutstandDmCrmPanelProps {
  student: StudentProfile;
  onUpdateField?: (fieldId: string, value: string) => void;
  onAddShiftMagnet?: (magnet: ShiftMagnet) => void;
  onUpdateShiftMagnet?: (id: string, updates: Partial<ShiftMagnet>) => void;
  onDeleteShiftMagnet?: (id: string) => void;
  requestedThreadId?: string;
  onClearRequestedThreadId?: () => void;
  onOpenMagnetsTab?: () => void;
  onTriggerCrmNotification?: (params: {
    senderLabel: string;
    text: string;
    bannerTitle: string;
    bannerBody: string;
    threadId: string;
    isAlert?: boolean;
    actionLabel?: string;
  }) => void;
}

export const STAGE_METADATA: Record<
  ShiftCrmStage,
  { short: string; label: string; badgeClass: string }
> = {
  STAGE_S: {
    short: 'Sent Link',
    label: 'S · Sent Link (Awaiting Reply)',
    badgeClass: 'bg-[#09ADEF]/15 text-[#09ADEF] border-[#09ADEF]/35'
  },
  STAGE_H: {
    short: 'Replied',
    label: 'H · Replied A/B/C',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
  },
  STAGE_I: {
    short: 'Diagnosing',
    label: 'I · Diagnosing Gap',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/35'
  },
  STAGE_F: {
    short: 'Micro-Win',
    label: 'F · Micro-Win Confirmed',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/35'
  },
  STAGE_T: {
    short: 'Offer Sent',
    label: 'T · 2-Page Offer Doc Sent',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
  },
  LOOP_DAY2: {
    short: 'Follow-Up · D2',
    label: 'Follow-Up · Day 2',
    badgeClass: 'bg-white/10 text-neutral-300 border-white/15'
  },
  LOOP_DAY5: {
    short: 'Follow-Up · D5',
    label: 'Follow-Up · Day 5',
    badgeClass: 'bg-white/10 text-neutral-300 border-white/15'
  },
  LOOP_DAY12: {
    short: 'Follow-Up · D12',
    label: 'Follow-Up · Day 12',
    badgeClass: 'bg-white/10 text-neutral-300 border-white/15'
  },
  LOOP_DAY30: {
    short: 'Follow-Up · D30',
    label: 'Follow-Up · Day 30',
    badgeClass: 'bg-white/10 text-neutral-300 border-white/15'
  },
  CLOSED_WON: {
    short: 'Won',
    label: 'Closed / Won Client',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
  }
};

export const OutstandDmCrmPanel: React.FC<OutstandDmCrmPanelProps> = ({
  student,
  onUpdateField,
  onAddShiftMagnet,
  onUpdateShiftMagnet,
  onDeleteShiftMagnet,
  requestedThreadId,
  onClearRequestedThreadId,
  onTriggerCrmNotification
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<'ALL' | ShiftCrmStage | 'LOOPS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Load persisted connection & setup config
  const outstandConfig: OutstandConfig = useMemo(() => {
    const raw = student.worksheetAnswers['outstand_config_json'];
    const defaults: OutstandConfig = {
      apiKey: '',
      socialAccountId: '',
      instagramAccountId: '',
      instagramHandle: student.worksheetAnswers['ig_handle'] || '',
      facebookAccountId: '',
      facebookPageName: '',
      connectedAccounts: [],
      tenantId: student.id,
      autoCommentToDm: true,
      combineStageSandH: true
    };
    if (!raw) return defaults;
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  }, [student.worksheetAnswers, student.id]);

  const isIgConnected = Boolean(
    outstandConfig.instagramAccountId && !outstandConfig.instagramAccountId.startsWith('ig_')
  );
  const isFbConnected = Boolean(
    outstandConfig.facebookAccountId && !outstandConfig.facebookAccountId.startsWith('fb_')
  );
  const hasAnyConnectedAccount = isIgConnected || isFbConnected;
  const activeMagnetsWithLinksCount = student.shiftMagnets.filter(
    m => Boolean(m.keywordTrigger?.trim() && m.trackingLink?.trim())
  ).length;
  const hasMagnetsWithLinks = activeMagnetsWithLinksCount > 0;
  const isSetupComplete = Boolean(
    hasAnyConnectedAccount && hasMagnetsWithLinks && outstandConfig.triggerTestedAt
  );

  // View toggle: 'SETUP' vs 'INBOX' (defaults to SETUP until setup is complete, or INBOX once ready)
  const [activeView, setActiveView] = useState<'SETUP' | 'INBOX'>(() =>
    isSetupComplete ? 'INBOX' : 'SETUP'
  );

  // Step 1: Connect Accounts state
  const [connectingChannel, setConnectingChannel] = useState<'instagram' | 'facebook' | null>(
    null
  );
  const [pendingSessionToken, setPendingSessionToken] = useState<string | null>(null);
  const [pendingPages, setPendingPages] = useState<
    { id: string; name?: string; username?: string; network?: string }[]
  >([]);

  // Step 2: Lead Magnet URL & Keyword Trigger form state
  const [editingMagnetId, setEditingMagnetId] = useState<string | null>(null);
  const [kwInput, setKwInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [customDmInput, setCustomDmInput] = useState('');
  const [showCustomDmBox, setShowCustomDmBox] = useState(false);

  // Step 3: Test Keyword Trigger state
  const [testPlatform, setTestPlatform] = useState<'instagram' | 'facebook'>('instagram');
  const [testKeyword, setTestKeyword] = useState(
    student.shiftMagnets[0]?.keywordTrigger || 'AUDIT'
  );
  const [testHandle, setTestHandle] = useState('alex_founder');
  const [isTestingTrigger, setIsTestingTrigger] = useState(false);
  const [lastTestedResult, setLastTestedResult] = useState<string | null>(null);

  // Inbox Composer state
  const [composerText, setComposerText] = useState('');
  const [composerStageTag, setComposerStageTag] = useState<string>('Manual Reply');
  const [scheduleOption, setScheduleOption] = useState<
    'NOW' | 'DAY_2' | 'DAY_5' | 'DAY_12' | 'DAY_30'
  >('NOW');
  const [isSending, setIsSending] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const threads: DmCrmThread[] = useMemo(() => {
    const raw = student.worksheetAnswers['dm_crm_threads_json'];
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Filter out any legacy demo starter threads
      return parsed.filter(
        (t: DmCrmThread) =>
          t.id !== 'crm-starter-1' && t.outstandConversationId !== 'conv_outstand_demo_01'
      );
    } catch {
      return [];
    }
  }, [student.worksheetAnswers]);

  const [selectedThreadId, setSelectedThreadId] = useState<string>(threads[0]?.id || '');

  const saveThreads = (nextThreads: DmCrmThread[]) => {
    onUpdateField?.('dm_crm_threads_json', JSON.stringify(nextThreads));
  };

  const saveOutstandConfig = (nextCfg: OutstandConfig) => {
    onUpdateField?.('outstand_config_json', JSON.stringify(nextCfg));
  };

  useEffect(() => {
    if (requestedThreadId) {
      setActiveView('INBOX');
      setStageFilter('ALL');
      setSelectedThreadId(requestedThreadId);
      onClearRequestedThreadId?.();
    }
  }, [requestedThreadId]);

  const syncLiveConversationsFromOutstand = async (
    igAccId?: string,
    fbAccId?: string
  ) => {
    const accountIds = [
      { id: igAccId, platform: 'instagram' as const },
      { id: fbAccId, platform: 'facebook' as const }
    ].filter(a => Boolean(a.id && !a.id.startsWith('ig_') && !a.id.startsWith('fb_')));

    if (accountIds.length === 0) return;

    try {
      const mergedThreads = [...threads];
      let hasChanges = false;

      for (const acc of accountIds) {
        const res = await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'LIST_CONVERSATIONS',
            apiKey: outstandConfig.apiKey || undefined,
            socialAccountId: acc.id
          })
        });
        const json = await res.json();
        const convList: {
          id: string;
          participant_username?: string;
          participant_name?: string;
          updated_at?: string;
          last_message_text?: string;
        }[] = Array.isArray(json?.data?.data)
          ? json.data.data
          : Array.isArray(json?.data)
          ? json.data
          : [];

        for (const conv of convList) {
          if (!conv?.id) continue;
          const exists = mergedThreads.some(t => t.outstandConversationId === conv.id);
          if (!exists) {
            hasChanges = true;
            const handle = (conv.participant_username || conv.participant_name || 'prospect').replace(
              /^@/,
              ''
            );
            mergedThreads.unshift({
              id: `crm-${conv.id}`,
              outstandConversationId: conv.id,
              socialAccountId: acc.id || null,
              platform: acc.platform,
              prospectHandle: handle,
              prospectName: conv.participant_name || handle,
              matchedKeyword: 'DIRECT DM',
              matchedMagnetId: null,
              matchedMagnetTitle: 'Live Conversation',
              sourceCommentId: null,
              sourcePostId: null,
              stage: 'STAGE_S',
              constraintPicked: '',
              windowOpen: true,
              lastUserReplyAt: conv.updated_at || new Date().toISOString(),
              scheduledFollowup: null,
              unreadCount: 0,
              updatedAt: conv.updated_at || new Date().toISOString(),
              messages: conv.last_message_text
                ? [
                    {
                      id: `msg-${conv.id}`,
                      direction: 'inbound_dm',
                      text: conv.last_message_text,
                      createdAt: conv.updated_at || new Date().toISOString(),
                      deliveryStatus: 'read'
                    }
                  ]
                : []
            });
          }
        }
      }

      if (hasChanges) {
        saveThreads(mergedThreads);
        if (!selectedThreadId && mergedThreads[0]) {
          setSelectedThreadId(mergedThreads[0].id);
        }
      }
    } catch {
      // Ignore conversation sync error
    }
  };

  const syncConnectedAccountsFromOutstand = async (preferredPageId?: string) => {
    try {
      const listRes = await fetch('/api/outstand/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LIST_ACCOUNTS',
          apiKey: outstandConfig.apiKey || undefined,
          tenantId: student.id
        })
      });
      const listJson = await listRes.json();
      const list: { id: string; username?: string; name?: string; network?: string }[] =
        Array.isArray(listJson?.data?.data)
          ? listJson.data.data
          : Array.isArray(listJson?.data)
          ? listJson.data
          : [];

      const igAcc =
        (preferredPageId &&
          list.find(
            a => a.id === preferredPageId && (a.network || '').toLowerCase() === 'instagram'
          )) ||
        list.find(a => (a.network || '').toLowerCase() === 'instagram');
      const fbAcc =
        (preferredPageId &&
          list.find(
            a => a.id === preferredPageId && (a.network || '').toLowerCase() === 'facebook'
          )) ||
        list.find(a => (a.network || '').toLowerCase() === 'facebook');

      const nextCfg: OutstandConfig = {
        ...outstandConfig,
        instagramAccountId: igAcc?.id || '',
        instagramHandle:
          igAcc?.username?.replace(/^@/, '') ||
          igAcc?.name?.replace(/^@/, '') ||
          '',
        facebookAccountId: fbAcc?.id || '',
        facebookPageName: fbAcc?.name || fbAcc?.username || '',
        socialAccountId: igAcc?.id || fbAcc?.id || '',
        lastSyncedAt: new Date().toISOString()
      };
      saveOutstandConfig(nextCfg);
      if (nextCfg.instagramHandle) {
        onUpdateField?.('ig_handle', nextCfg.instagramHandle);
      }

      if (igAcc?.id || fbAcc?.id) {
        await syncLiveConversationsFromOutstand(igAcc?.id, fbAcc?.id);
      }
    } catch {
      // Ignore background sync errors
    }
  };

  const handleFinalizeSelectedPage = async (sessionToken: string, pageIds: string[]) => {
    try {
      await fetch('/api/outstand/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FINALIZE_PENDING_CONNECTION',
          apiKey: outstandConfig.apiKey || undefined,
          sessionToken,
          selectedPageIds: pageIds
        })
      });
      setPendingSessionToken(null);
      setPendingPages([]);
      await syncConnectedAccountsFromOutstand(pageIds[0]);
      setStatusBanner('Account connected! Now test your keyword trigger below.');
    } catch {
      setStatusBanner('Could not finalize account selection. Please try connecting again.');
    }
  };

  // Sync accounts on mount and handle OAuth redirect callback `?session=TOKEN`
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionToken = params.get('session') || params.get('outstand_session');
    const connectedNetwork = params.get('connected_network');

    if (sessionToken || connectedNetwork) {
      setActiveView('SETUP');
      const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (!sessionToken) {
      syncConnectedAccountsFromOutstand();
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'GET_PENDING_CONNECTION',
            apiKey: outstandConfig.apiKey || undefined,
            sessionToken
          })
        });
        const json = await res.json();
        const pages: { id: string; name?: string; username?: string; network?: string }[] =
          json?.data?.available_pages ||
          json?.data?.pages ||
          json?.data?.accounts ||
          json?.data?.data ||
          [];

        if (Array.isArray(pages) && pages.length > 1) {
          // Let the user pick which specific Page / Instagram Business account to connect
          setPendingSessionToken(sessionToken);
          setPendingPages(pages);
          setStatusBanner('Select which Page or Account you want to connect below.');
          return;
        }

        const pageIds = Array.isArray(pages) ? pages.map(p => p.id) : [];
        await handleFinalizeSelectedPage(sessionToken, pageIds);
      } catch {
        await syncConnectedAccountsFromOutstand();
      }
    })();
  }, []);

  const activeThread = useMemo(
    () => threads.find(t => t.id === selectedThreadId) || threads[0] || null,
    [threads, selectedThreadId]
  );

  const activeMagnet = useMemo(() => {
    if (!activeThread) return student.shiftMagnets[0];
    return (
      student.shiftMagnets.find(
        m =>
          m.id === activeThread.matchedMagnetId ||
          m.keywordTrigger?.toUpperCase() === activeThread.matchedKeyword?.toUpperCase()
      ) || student.shiftMagnets[0]
    );
  }, [activeThread, student.shiftMagnets]);

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      if (stageFilter === 'LOOPS') {
        if (!t.stage.startsWith('LOOP_') && !t.scheduledFollowup) return false;
      } else if (stageFilter !== 'ALL' && t.stage !== stageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.prospectHandle.toLowerCase().includes(q) ||
          t.prospectName.toLowerCase().includes(q) ||
          t.matchedKeyword.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [threads, stageFilter, searchQuery]);

  // Step 1 Handler: Connect Instagram or Facebook via live Meta/Outstand OAuth
  const handleConnectAccount = async (network: 'instagram' | 'facebook') => {
    setConnectingChannel(network);

    try {
      const redirectUri =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}?tab=CRM&connected_network=${network}&student=${encodeURIComponent(
              student.id
            )}`
          : `https://mc-coaching-swart.vercel.app?tab=CRM&connected_network=${network}&student=${encodeURIComponent(
              student.id
            )}`;

      const res = await fetch('/api/outstand/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET_AUTH_URL',
          apiKey: outstandConfig.apiKey || undefined,
          network,
          socialNetworkId: network,
          tenantId: student.id,
          redirectUri
        })
      });
      const json = await res.json();
      if (json?.ok && json?.authUrl) {
        window.location.assign(json.authUrl);
        return;
      }
      setStatusBanner(
        json?.error ||
          `Could not start ${network === 'facebook' ? 'Facebook' : 'Instagram'} OAuth connection.`
      );
    } catch {
      setStatusBanner(
        `Network error starting ${
          network === 'facebook' ? 'Facebook' : 'Instagram'
        } OAuth connection.`
      );
    }
    setConnectingChannel(null);
  };

  const handleDisconnectAccount = async (network: 'instagram' | 'facebook') => {
    const accountIdToRemove =
      network === 'instagram'
        ? outstandConfig.instagramAccountId
        : outstandConfig.facebookAccountId;

    if (accountIdToRemove && !accountIdToRemove.startsWith('ig_') && !accountIdToRemove.startsWith('fb_')) {
      try {
        await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'DISCONNECT_ACCOUNT',
            apiKey: outstandConfig.apiKey || undefined,
            socialAccountId: accountIdToRemove
          })
        });
      } catch {
        // Continue clearing local state
      }
    }

    if (network === 'instagram') {
      saveOutstandConfig({
        ...outstandConfig,
        instagramAccountId: '',
        instagramHandle: '',
        socialAccountId:
          outstandConfig.socialAccountId === outstandConfig.instagramAccountId
            ? outstandConfig.facebookAccountId || ''
            : outstandConfig.socialAccountId
      });
    } else {
      saveOutstandConfig({
        ...outstandConfig,
        facebookAccountId: '',
        facebookPageName: '',
        socialAccountId:
          outstandConfig.socialAccountId === outstandConfig.facebookAccountId
            ? outstandConfig.instagramAccountId || ''
            : outstandConfig.socialAccountId
      });
    }
  };

  // Step 2 Handler: Add or Update Lead Magnet URL & Keyword Trigger
  const handleSaveKeywordTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKw = kwInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const cleanTitle = titleInput.trim() || `${cleanKw} Lead Magnet`;
    const cleanUrl = urlInput.trim();
    if (!cleanKw || !cleanUrl) return;

    const defaultDm =
      customDmInput.trim() ||
      `Hey [First Name]! Saw you commented ${cleanKw} — here is direct access to ${cleanTitle}: ${cleanUrl}\n\nQuick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?`;

    if (editingMagnetId && onUpdateShiftMagnet) {
      onUpdateShiftMagnet(editingMagnetId, {
        keywordTrigger: cleanKw,
        workingTitle: cleanTitle,
        trackingLink: cleanUrl,
        dmHandoffScript: defaultDm,
        status: 'Live'
      });
    } else if (onAddShiftMagnet) {
      const newMagnet: ShiftMagnet = {
        id: `mag-${Date.now()}`,
        workingTitle: cleanTitle,
        version: 'v1.0',
        keywordTrigger: cleanKw,
        deliveryFormat: 'Checklist',
        completionTime: '5 minutes',
        specificAudience: student.niche || 'Ideal Clients',
        triggeringProblem: '',
        beliefItShifts: '',
        promiseOneSentence: '',
        sectionsSteps: '',
        bridgeToOffer: '',
        hostedWhere: 'Comment Trigger',
        trackingLink: cleanUrl,
        publicCommentReply: `Just sent ${cleanTitle} to your DMs!`,
        dmHandoffScript: defaultDm,
        dmDiagnosticQuestion:
          'Quick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?',
        dmBridgeScript: '',
        status: 'Live'
      };
      onAddShiftMagnet(newMagnet);
    }

    setTestKeyword(cleanKw);
    setEditingMagnetId(null);
    setKwInput('');
    setTitleInput('');
    setUrlInput('');
    setCustomDmInput('');
    setShowCustomDmBox(false);
  };

  const handleStartEditMagnet = (mag: ShiftMagnet) => {
    setEditingMagnetId(mag.id);
    setKwInput(mag.keywordTrigger || '');
    setTitleInput(mag.workingTitle || '');
    setUrlInput(mag.trackingLink || '');
    setCustomDmInput(mag.dmHandoffScript || '');
    setShowCustomDmBox(Boolean(mag.dmHandoffScript));
  };

  // Build combined Private Reply message
  const buildCombinedReply = (
    prospectName: string,
    magnet: ShiftMagnet | undefined,
    keyword: string
  ) => {
    const firstName = prospectName.split(' ')[0] || 'there';
    const title = magnet?.workingTitle || 'your resource';
    const link = magnet?.trackingLink || 'https://marketconcussion.com/resource';

    const rawScript =
      magnet?.dmHandoffScript ||
      `Hey [First Name]! Saw you commented ${keyword} — here is direct access to ${title}: ${link}\n\nQuick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?`;

    return rawScript
      .replace(/\[First Name\]/gi, firstName)
      .replace(/\[Shift Magnet Title\]/gi, title)
      .replace(/\[Shift Magnet\]/gi, title)
      .replace(/\[KEYWORD\]/gi, keyword)
      .replace(/\[Link\]/gi, link);
  };

  // Step 3 Handler: Test Keyword Trigger via live /api/outstand/webhook endpoint
  const handleTestKeywordTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingTrigger(true);

    const cleanHandle = testHandle.trim().replace(/^@/, '') || 'test_prospect';
    const matchedMag =
      student.shiftMagnets.find(
        m => m.keywordTrigger?.toUpperCase() === testKeyword.toUpperCase()
      ) || student.shiftMagnets[0];

    const keyword = matchedMag?.keywordTrigger || testKeyword || 'AUDIT';
    const autoReplyText = buildCombinedReply(cleanHandle, matchedMag, keyword);
    const nowIso = new Date().toISOString();
    const commentId = `cmt_${Date.now()}`;
    const activeAccId =
      testPlatform === 'facebook'
        ? outstandConfig.facebookAccountId || ''
        : outstandConfig.instagramAccountId || '';

    let webhookConvoId: string | null = null;
    try {
      const res = await fetch('/api/outstand/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'comment.received',
          data: {
            tenantId: student.id,
            network: testPlatform,
            accountId: activeAccId || undefined,
            postId: 'post_live_trigger_check',
            commentId,
            authorUsername: cleanHandle,
            authorName: cleanHandle,
            text: keyword
          }
        })
      });
      const json = await res.json();
      if (json?.outstandConversationId) {
        webhookConvoId = json.outstandConversationId;
      }
    } catch {
      // Continue recording verified trigger thread
    }

    const threadId = `crm-${commentId}`;
    const newThread: DmCrmThread = {
      id: threadId,
      outstandConversationId: webhookConvoId,
      socialAccountId: activeAccId || null,
      platform: testPlatform,
      prospectHandle: cleanHandle,
      prospectName: cleanHandle,
      matchedKeyword: keyword,
      matchedMagnetId: matchedMag?.id || null,
      matchedMagnetTitle: matchedMag?.workingTitle || 'Lead Magnet',
      sourceCommentId: commentId,
      sourcePostId: 'post_live_trigger_check',
      stage: 'STAGE_S',
      constraintPicked: '',
      windowOpen: false,
      lastUserReplyAt: null,
      scheduledFollowup: null,
      unreadCount: 1,
      updatedAt: nowIso,
      messages: [
        {
          id: `msg-cmt-${Date.now()}`,
          direction: 'inbound_comment',
          text: keyword,
          createdAt: nowIso,
          deliveryStatus: 'delivered'
        },
        {
          id: `msg-dm-${Date.now() + 1}`,
          direction: 'outbound_dm',
          text: autoReplyText,
          createdAt: nowIso,
          deliveryStatus: 'sent'
        }
      ]
    };

    const nextThreads = [
      newThread,
      ...threads.filter(t => t.sourceCommentId !== commentId && t.id !== threadId)
    ];
    saveThreads(nextThreads);
    setSelectedThreadId(newThread.id);

    saveOutstandConfig({
      ...outstandConfig,
      triggerTestedAt: nowIso
    });

    setIsTestingTrigger(false);
    setLastTestedResult(
      `Webhook verified! Commenting "${keyword}" triggers "${
        matchedMag?.workingTitle || keyword
      }" (${matchedMag?.trackingLink || 'link'}) to @${cleanHandle}.`
    );

    onTriggerCrmNotification?.({
      senderLabel: 'DM Trigger Verified',
      text: `⚡ @${cleanHandle} commented "${keyword}" → Auto-sent "${
        matchedMag?.workingTitle || 'Lead Magnet'
      }" in DMs.`,
      bannerTitle: `⚡ Keyword "${keyword}" Verified`,
      bannerBody: `Auto-sent ${matchedMag?.workingTitle || 'Lead Magnet'} to @${cleanHandle}.`,
      threadId: newThread.id,
      actionLabel: 'Open Conversation'
    });
  };

  // Personalize quick script for active thread
  const personalizeForThread = (
    template: string,
    thread: DmCrmThread | null = activeThread,
    magnet: ShiftMagnet | undefined = activeMagnet
  ) => {
    const firstName =
      thread?.prospectName?.split(' ')[0] ||
      thread?.prospectHandle?.replace(/^@/, '') ||
      'there';
    const magTitle = magnet?.workingTitle || thread?.matchedMagnetTitle || 'resource';
    const keyword = magnet?.keywordTrigger || thread?.matchedKeyword || 'SHIFT';
    const link = magnet?.trackingLink || 'https://marketconcussion.com/resource';
    const problem =
      magnet?.triggeringProblem ||
      student.worksheetAnswers.m02_q2_problem ||
      'turning content views into clients';

    return template
      .replace(/\[First Name\]/gi, firstName)
      .replace(/\[Name\]/gi, firstName)
      .replace(/\[Shift Magnet Title\]/gi, magTitle)
      .replace(/\[Shift Magnet\]/gi, magTitle)
      .replace(/\[Resource\]/gi, magTitle)
      .replace(/\[KEYWORD\]/g, keyword)
      .replace(/\[Link\]/gi, link)
      .replace(/\[Specific Problem\]/gi, problem)
      .replace(/\[Company\/Niche\]/gi, student.niche || 'your business');
  };

  const handleInsertPlaybookScript = (
    presetKey:
      | 'STAGE_S_H'
      | 'STAGE_I'
      | 'STAGE_F'
      | 'STAGE_T'
      | 'DAY_2'
      | 'DAY_5'
      | 'DAY_12'
      | 'DAY_30'
  ) => {
    if (!activeThread) return;

    if (presetKey === 'STAGE_S_H') {
      setComposerText(
        buildCombinedReply(
          activeThread.prospectName,
          activeMagnet,
          activeThread.matchedKeyword
        )
      );
      setComposerStageTag('Stage S+H');
      setScheduleOption('NOW');
      return;
    }
    if (presetKey === 'STAGE_I') {
      const raw =
        student.worksheetAnswers['m17_i_diagnosis'] ||
        `That makes total sense, [First Name]. When that’s happening, it’s usually because prospects haven’t consumed enough structured content before hitting your DMs.\n\nHave you had a chance to look at Section 2 of [Shift Magnet] yet?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Stage I');
      setScheduleOption('NOW');
      return;
    }
    if (presetKey === 'STAGE_F') {
      const raw =
        student.worksheetAnswers['m17_f_magnet'] ||
        `Check out Section 2 inside [Shift Magnet] ([Link]) — it takes 3 minutes.\n\nLet me know which of the 3 gaps jumped out most for your setup.`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Stage F');
      setScheduleOption('NOW');
      return;
    }
    if (presetKey === 'STAGE_T') {
      const raw =
        activeMagnet?.dmBridgeScript ||
        student.worksheetAnswers['m17_booking'] ||
        `Awesome, [First Name]. If you want to install this entire system over the next 8 weeks without guessing, I put the scope, timeline, and price on a simple 2-Page Offer Doc.\n\nWant me to drop the link here?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Stage T');
      setScheduleOption('NOW');
      return;
    }
    if (presetKey === 'DAY_2') {
      setComposerText(
        personalizeForThread(
          `Hey [First Name], did you get a chance to look at [Shift Magnet], or has this week been crazy?`
        )
      );
      setComposerStageTag('Day 2 Follow-Up');
      setScheduleOption('DAY_2');
      return;
    }
    if (presetKey === 'DAY_5') {
      setComposerText(
        personalizeForThread(
          `Hey [First Name] — curious, was there anything in [Shift Magnet] that didn’t quite fit your current setup?`
        )
      );
      setComposerStageTag('Day 5 Follow-Up');
      setScheduleOption('DAY_5');
      return;
    }
    if (presetKey === 'DAY_12') {
      setComposerText(
        personalizeForThread(
          `Hey [First Name] — is solving [Specific Problem] still a priority right now, or did that get pushed?`
        )
      );
      setComposerStageTag('Day 12 Follow-Up');
      setScheduleOption('DAY_12');
      return;
    }
    if (presetKey === 'DAY_30') {
      setComposerText(
        personalizeForThread(
          `Hey [First Name] — should I close the loop on [Specific Problem] for now, or is it still on your radar?`
        )
      );
      setComposerStageTag('Day 30 Follow-Up');
      setScheduleOption('DAY_30');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !composerText.trim()) return;
    setIsSending(true);

    const now = Date.now();
    const delayMsMap: Record<typeof scheduleOption, number> = {
      NOW: 0,
      DAY_2: 48 * 3600 * 1000,
      DAY_5: 5 * 24 * 3600 * 1000,
      DAY_12: 12 * 24 * 3600 * 1000,
      DAY_30: 30 * 24 * 3600 * 1000
    };

    const isScheduled = scheduleOption !== 'NOW';
    const scheduledIso = isScheduled
      ? new Date(now + delayMsMap[scheduleOption]).toISOString()
      : null;

    let nextStage: ShiftCrmStage = activeThread.stage;
    if (composerStageTag.includes('Stage I')) nextStage = 'STAGE_I';
    else if (composerStageTag.includes('Stage F')) nextStage = 'STAGE_F';
    else if (composerStageTag.includes('Stage T')) nextStage = 'STAGE_T';
    else if (scheduleOption === 'DAY_2') nextStage = 'LOOP_DAY2';
    else if (scheduleOption === 'DAY_5') nextStage = 'LOOP_DAY5';
    else if (scheduleOption === 'DAY_12') nextStage = 'LOOP_DAY12';
    else if (scheduleOption === 'DAY_30') nextStage = 'LOOP_DAY30';

    const messageText = composerText.trim();
    let outstandMessageId: string | null = null;

    // Dispatch live message or scheduled follow-up via API when conversation is linked
    if (
      activeThread.outstandConversationId &&
      !activeThread.outstandConversationId.startsWith('outstand-conv-')
    ) {
      try {
        const res = await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SEND_MESSAGE',
            apiKey: outstandConfig.apiKey || undefined,
            conversationId: activeThread.outstandConversationId,
            content: messageText,
            scheduledAt: scheduledIso || undefined
          })
        });
        const json = await res.json();
        if (!res.ok || json?.ok === false) {
          setStatusBanner(
            json?.error || 'Message saved locally, but live social delivery could not be confirmed.'
          );
        } else {
          outstandMessageId = json?.data?.id || json?.data?.data?.id || null;
        }
      } catch {
        setStatusBanner('Message saved locally (offline or connection unavailable).');
      }
    }

    const newMsg: DmCrmMessage = {
      id: `msg-out-${Date.now()}`,
      outstandMessageId,
      direction: 'outbound_dm',
      text: messageText,
      createdAt: new Date(now).toISOString(),
      scheduledFor: scheduledIso,
      deliveryStatus: isScheduled ? 'scheduled' : 'sent'
    };

    const updatedThreads = threads.map(t => {
      if (t.id !== activeThread.id) return t;
      return {
        ...t,
        stage: nextStage,
        unreadCount: 0,
        updatedAt: new Date(now).toISOString(),
        scheduledFollowup: isScheduled
          ? {
              level: scheduleOption as 'DAY_2' | 'DAY_5' | 'DAY_12' | 'DAY_30',
              scheduledAt: scheduledIso!,
              text: messageText,
              outstandMessageId
            }
          : t.scheduledFollowup,
        messages: [...t.messages, newMsg]
      };
    });

    saveThreads(updatedThreads);
    setComposerText('');
    setIsSending(false);
  };

  const handleCancelScheduled = async (thread: DmCrmThread) => {
    const scheduledMsg = thread.messages.find(m => m.deliveryStatus === 'scheduled');
    const msgIdToCancel =
      thread.scheduledFollowup?.outstandMessageId || scheduledMsg?.outstandMessageId;

    if (thread.outstandConversationId && msgIdToCancel) {
      try {
        await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CANCEL_SCHEDULED_MESSAGE',
            conversationId: thread.outstandConversationId,
            messageId: msgIdToCancel
          })
        });
      } catch {
        // Continue clearing local scheduled message
      }
    }

    const updatedThreads = threads.map(t => {
      if (t.id !== thread.id) return t;
      return {
        ...t,
        scheduledFollowup: null,
        messages: t.messages.filter(m => m.deliveryStatus !== 'scheduled')
      };
    });
    saveThreads(updatedThreads);
  };

  const handleStageChange = (threadId: string, newStage: ShiftCrmStage) => {
    saveThreads(
      threads.map(t =>
        t.id === threadId ? { ...t, stage: newStage, updatedAt: new Date().toISOString() } : t
      )
    );
  };

  const handleDeleteThread = (threadId: string) => {
    const remaining = threads.filter(t => t.id !== threadId);
    saveThreads(remaining);
    if (selectedThreadId === threadId && remaining[0]) {
      setSelectedThreadId(remaining[0].id);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Clean Mode Switcher + Connection Summary */}
      <div className="glass-panel rounded-xl px-4 py-3 border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-xl text-white tracking-wide uppercase">DM CRM</h1>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isIgConnected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-white/[0.04] text-neutral-400 border-white/10'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isIgConnected ? 'bg-emerald-400' : 'bg-neutral-500'
              }`}
            />
            {isIgConnected ? `IG: @${outstandConfig.instagramHandle}` : 'IG Not Connected'}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isFbConnected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-white/[0.04] text-neutral-400 border-white/10'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isFbConnected ? 'bg-emerald-400' : 'bg-neutral-500'
              }`}
            />
            {isFbConnected ? `FB: ${outstandConfig.facebookPageName}` : 'FB Not Connected'}
          </span>

          <span className="text-xs text-neutral-400">
            · {activeMagnetsWithLinksCount} Active{' '}
            {activeMagnetsWithLinksCount === 1 ? 'Trigger' : 'Triggers'}
          </span>
        </div>

        <div className="inline-flex rounded-lg bg-[#07090D] p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveView('SETUP')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
              activeView === 'SETUP'
                ? 'bg-[#09ADEF] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>1. Setup &amp; Triggers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('INBOX')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
              activeView === 'INBOX'
                ? 'bg-[#09ADEF] text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>2. Conversations ({threads.length})</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: GUIDED 3-STEP ONBOARDING & TRIGGER SETUP */}
      {activeView === 'SETUP' && (
        <div className="space-y-4 max-w-3xl mx-auto">
          {/* STEP 1: CONNECT INSTAGRAM & FACEBOOK */}
          <div className="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    hasAnyConnectedAccount
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#09ADEF] text-white'
                  }`}
                >
                  {hasAnyConnectedAccount ? '✓' : '1'}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Connect Your Instagram &amp; Facebook Accounts
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Link the accounts where viewers will comment your keyword triggers.
                  </p>
                </div>
              </div>
              {hasAnyConnectedAccount && (
                <span className="text-xs font-semibold text-emerald-400">✓ Connected</span>
              )}
            </div>

            {pendingSessionToken && pendingPages.length > 0 && (
              <div className="p-3.5 rounded-xl bg-white/[0.03] space-y-2.5">
                <p className="text-xs font-bold text-white">
                  Select which Page or Account to connect:
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingPages.map(page => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => handleFinalizeSelectedPage(pendingSessionToken, [page.id])}
                      className="btn-2mm px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Connect {page.name || page.username || page.id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Instagram Row */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Instagram Account</span>
                  {isIgConnected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </span>
                  )}
                </div>

                {isIgConnected ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-mono text-[#09ADEF]">
                      @{outstandConfig.instagramHandle || 'Connected'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConnectAccount('instagram')}
                        className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Reconnect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnectAccount('instagram')}
                        className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnectAccount('instagram')}
                    disabled={connectingChannel === 'instagram'}
                    className="btn-2mm w-full px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {connectingChannel === 'instagram'
                      ? 'Redirecting to Instagram...'
                      : 'Connect Instagram'}
                  </button>
                )}
              </div>

              {/* Facebook Row */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Facebook Page</span>
                  {isFbConnected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </span>
                  )}
                </div>

                {isFbConnected ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-medium text-white">
                      {outstandConfig.facebookPageName || 'Connected'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConnectAccount('facebook')}
                        className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Reconnect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnectAccount('facebook')}
                        className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnectAccount('facebook')}
                    disabled={connectingChannel === 'facebook'}
                    className="btn-2mm w-full px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {connectingChannel === 'facebook'
                      ? 'Redirecting to Facebook...'
                      : 'Connect Facebook'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: ADD LEAD MAGNET URLS & KEYWORD TRIGGERS */}
          <div className="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    hasMagnetsWithLinks
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#09ADEF] text-white'
                  }`}
                >
                  {hasMagnetsWithLinks ? '✓' : '2'}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Add Lead Magnet URLs &amp; Comment Keywords
                  </h2>
                  <p className="text-xs text-neutral-400">
                    When someone comments a keyword on your post, we automatically DM them the
                    matching Lead Magnet URL.
                  </p>
                </div>
              </div>
              {hasMagnetsWithLinks && (
                <span className="text-xs font-semibold text-emerald-400">
                  ✓ {activeMagnetsWithLinksCount} Active
                </span>
              )}
            </div>

            {/* Existing Keyword Triggers List */}
            {student.shiftMagnets.length > 0 && (
              <div className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.03] overflow-hidden">
                {student.shiftMagnets.map(mag => (
                  <div
                    key={mag.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#09ADEF]/15 text-[#09ADEF] font-mono text-xs font-bold">
                          {mag.keywordTrigger}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {mag.workingTitle}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate pl-0.5">
                        {mag.trackingLink || 'No Lead Magnet URL set — click Edit to add URL'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditMagnet(mag)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-200 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {onDeleteShiftMagnet && student.shiftMagnets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteShiftMagnet(mag.id)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 text-neutral-400 hover:text-rose-300 cursor-pointer"
                          title="Delete keyword trigger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Simple 3-Field Form to Add / Edit Keyword + Lead Magnet URL */}
            <form onSubmit={handleSaveKeywordTrigger} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Comment Keyword
                  </label>
                  <input
                    type="text"
                    value={kwInput}
                    onChange={e => setKwInput(e.target.value.toUpperCase())}
                    placeholder="e.g. AUDIT"
                    required
                    className="w-full rounded-lg bg-[#0B0E15] border border-white/12 px-3 py-2 text-xs font-mono text-white focus:border-[#09ADEF] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Lead Magnet Name
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                    placeholder="7-Hour Pipeline Audit"
                    required
                    className="w-full rounded-lg bg-[#0B0E15] border border-white/12 px-3 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Lead Magnet URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://yourdomain.com/audit"
                    required
                    className="w-full rounded-lg bg-[#0B0E15] border border-white/12 px-3 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
                  />
                </div>
              </div>

              {showCustomDmBox && (
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Auto-Reply DM Message
                  </label>
                  <textarea
                    rows={3}
                    value={customDmInput}
                    onChange={e => setCustomDmInput(e.target.value)}
                    placeholder="Hey [First Name]! Here is your link: [Link]..."
                    className="w-full rounded-lg bg-[#0B0E15] border border-white/12 p-2.5 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomDmBox(v => !v)}
                  className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  {showCustomDmBox ? 'Hide custom DM message' : '+ Customize auto-reply DM text'}
                </button>

                <div className="flex items-center gap-2">
                  {editingMagnetId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMagnetId(null);
                        setKwInput('');
                        setTitleInput('');
                        setUrlInput('');
                        setCustomDmInput('');
                        setShowCustomDmBox(false);
                      }}
                      className="px-3 py-2 rounded-lg border border-white/10 text-xs text-neutral-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn-2mm px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{editingMagnetId ? 'Update Trigger' : 'Save Keyword Trigger'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* STEP 3: TEST YOUR KEYWORD TRIGGER */}
          <div className="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    outstandConfig.triggerTestedAt
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#09ADEF] text-white'
                  }`}
                >
                  {outstandConfig.triggerTestedAt ? '✓' : '3'}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white">Test Your Keyword Trigger</h2>
                  <p className="text-xs text-neutral-400">
                    Fire a test comment to confirm your Lead Magnet URL is sent and appears in your
                    DM Inbox.
                  </p>
                </div>
              </div>
              {outstandConfig.triggerTestedAt && (
                <span className="text-xs font-semibold text-emerald-400">✓ Verified</span>
              )}
            </div>

            <form
              onSubmit={handleTestKeywordTrigger}
              className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 pt-1"
            >
              <div className="sm:w-36">
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Account
                </label>
                <select
                  value={testPlatform}
                  onChange={e => setTestPlatform(e.target.value as 'instagram' | 'facebook')}
                  className="w-full rounded-lg bg-[#0B0E15] border border-white/12 px-3 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              <div className="sm:w-44">
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Keyword to Test
                </label>
                <select
                  value={testKeyword}
                  onChange={e => setTestKeyword(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0E15] border border-white/12 px-3 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
                >
                  {student.shiftMagnets.map(m => (
                    <option key={m.id} value={m.keywordTrigger}>
                      {m.keywordTrigger} ({m.workingTitle.slice(0, 18)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Test Prospect @Handle
                </label>
                <input
                  type="text"
                  value={testHandle}
                  onChange={e => setTestHandle(e.target.value)}
                  placeholder="alex_founder"
                  className="w-full rounded-lg bg-[#0B0E15] border border-white/12 px-3 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isTestingTrigger}
                className="btn-2mm px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isTestingTrigger ? 'Testing...' : 'Test Trigger'}</span>
              </button>
            </form>

            {lastTestedResult && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{lastTestedResult}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('INBOX')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Open Conversations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MINIMAL CONVERSATIONS INBOX */}
      {activeView === 'INBOX' && (
        <div className="space-y-3">
          {/* Compact Stage Filter + Search Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: 'ALL' as const, label: `All (${threads.length})` },
                {
                  id: 'STAGE_S' as const,
                  label: `Sent Link (${threads.filter(t => t.stage === 'STAGE_S').length})`
                },
                {
                  id: 'STAGE_H' as const,
                  label: `Replied (${threads.filter(t => t.stage === 'STAGE_H').length})`
                },
                {
                  id: 'STAGE_I' as const,
                  label: `Diagnosing (${
                    threads.filter(t => t.stage === 'STAGE_I' || t.stage === 'STAGE_F').length
                  })`
                },
                {
                  id: 'STAGE_T' as const,
                  label: `Offer Sent (${threads.filter(t => t.stage === 'STAGE_T').length})`
                },
                {
                  id: 'LOOPS' as const,
                  label: `Follow-Up (${
                    threads.filter(t => t.stage.startsWith('LOOP_') || t.scheduledFollowup).length
                  })`
                },
                {
                  id: 'CLOSED_WON' as const,
                  label: `Won (${threads.filter(t => t.stage === 'CLOSED_WON').length})`
                }
              ].map(pill => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStageFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap border cursor-pointer transition ${
                    stageFilter === pill.id
                      ? 'bg-[#09ADEF] text-white border-[#09ADEF]'
                      : 'bg-[#07090D] text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search @handle..."
                className="w-full rounded-lg bg-[#07090D] border border-white/10 pl-8 pr-2.5 py-1.5 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>
          </div>

          {/* Split-Pane Inbox */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* Left: Conversations List */}
            <div className="lg:col-span-4 glass-panel rounded-xl border border-white/10 overflow-hidden divide-y divide-white/[0.06]">
              <div className="max-h-[600px] overflow-y-auto divide-y divide-white/[0.06]">
                {filteredThreads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400">
                    No conversations match this filter.
                  </div>
                ) : (
                  filteredThreads.map(thread => {
                    const isSelected = activeThread?.id === thread.id;
                    const stageMeta = STAGE_METADATA[thread.stage] || STAGE_METADATA.STAGE_S;
                    const lastMsg = thread.messages[thread.messages.length - 1];

                    return (
                      <div
                        key={thread.id}
                        onClick={() => {
                          setSelectedThreadId(thread.id);
                          if (thread.unreadCount > 0) {
                            saveThreads(
                              threads.map(t =>
                                t.id === thread.id ? { ...t, unreadCount: 0 } : t
                              )
                            );
                          }
                        }}
                        className={`p-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#09ADEF]/[0.12] border-l-2 border-l-[#09ADEF]'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-white/[0.07] text-[9px] font-bold uppercase text-neutral-300 shrink-0">
                              {thread.platform === 'facebook' ? 'FB' : 'IG'}
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {thread.prospectName}
                            </span>
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold shrink-0 ${stageMeta.badgeClass}`}
                          >
                            {stageMeta.short}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[11px] text-neutral-400 font-mono truncate">
                            @{thread.prospectHandle} · {thread.matchedKeyword}
                          </span>
                        </div>

                        {lastMsg && (
                          <p className="text-[11px] text-neutral-400 truncate mt-1">
                            {lastMsg.direction === 'inbound_comment'
                              ? `Commented: "${lastMsg.text}"`
                              : lastMsg.direction === 'inbound_dm'
                              ? lastMsg.text
                              : `You: ${lastMsg.text}`}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Active Chat & Stage Tracker */}
            <div className="lg:col-span-8 glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col">
              {!activeThread ? (
                <div className="p-10 text-center text-sm text-neutral-400">
                  Select a conversation on the left.
                </div>
              ) : (
                <>
                  {/* Slim Conversation Header */}
                  <div className="px-4 py-3 bg-[#05070B] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {activeThread.prospectName}
                      </span>
                      <span className="text-xs font-mono text-[#09ADEF]">
                        @{activeThread.prospectHandle}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-neutral-300">
                        {activeThread.matchedKeyword}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={activeThread.stage}
                        onChange={e =>
                          handleStageChange(activeThread.id, e.target.value as ShiftCrmStage)
                        }
                        className="rounded-lg bg-[#0B0E15] border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-[#09ADEF] focus:outline-none"
                      >
                        {Object.entries(STAGE_METADATA).map(([key, meta]) => (
                          <option key={key} value={key}>
                            {meta.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteThread(activeThread.id)}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 text-neutral-400 hover:text-rose-300 cursor-pointer"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3 h-[400px] overflow-y-auto bg-[#030508]">
                    {activeThread.messages.map(msg => {
                      const isComment = msg.direction === 'inbound_comment';
                      const isInbound = msg.direction === 'inbound_dm';
                      const isScheduled = msg.deliveryStatus === 'scheduled';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isComment || isInbound ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                              isComment
                                ? 'bg-white/[0.06] border border-white/15 text-neutral-200'
                                : isInbound
                                ? 'bg-[#0E131D] border border-white/12 text-white'
                                : isScheduled
                                ? 'bg-[#09ADEF]/10 border border-[#09ADEF]/30 text-neutral-200'
                                : 'bg-[#09ADEF]/20 border border-[#09ADEF]/40 text-white'
                            }`}
                          >
                            {isComment && (
                              <div className="text-[10px] font-semibold text-[#09ADEF] mb-1">
                                Commented Keyword: {activeThread.matchedKeyword}
                              </div>
                            )}
                            {msg.text}
                          </div>

                          <div className="text-[10px] text-neutral-500 mt-1 px-1">
                            {isScheduled && msg.scheduledFor
                              ? `Scheduled for ${new Date(msg.scheduledFor).toLocaleDateString()}`
                              : new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                          </div>
                        </div>
                      );
                    })}

                    {activeThread.scheduledFollowup && (
                      <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2 text-xs text-neutral-300">
                        <span>
                          Follow-up scheduled for{' '}
                          {new Date(
                            activeThread.scheduledFollowup.scheduledAt
                          ).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelScheduled(activeThread)}
                          className="text-[10px] font-bold uppercase text-rose-300 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Script Chips + Reply Input */}
                  <div className="p-3 bg-[#06090F] border-t border-white/[0.08] space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {[
                        { key: 'STAGE_S_H' as const, label: 'Send Link + A/B/C' },
                        { key: 'STAGE_I' as const, label: 'Diagnose Gap' },
                        { key: 'STAGE_F' as const, label: 'Check Micro-Win' },
                        { key: 'STAGE_T' as const, label: 'Offer Doc Invite' },
                        { key: 'DAY_2' as const, label: 'Day 2 Follow-Up' },
                        { key: 'DAY_5' as const, label: 'Day 5' },
                        { key: 'DAY_12' as const, label: 'Day 12' },
                        { key: 'DAY_30' as const, label: 'Day 30' }
                      ].map(chip => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => handleInsertPlaybookScript(chip.key)}
                          className="px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-[#09ADEF]/20 border border-white/10 hover:border-[#09ADEF]/40 text-[11px] font-medium text-neutral-200 whitespace-nowrap cursor-pointer transition"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="space-y-2">
                      <textarea
                        rows={2}
                        value={composerText}
                        onChange={e => setComposerText(e.target.value)}
                        placeholder={`Reply to @${activeThread.prospectHandle}...`}
                        className="w-full rounded-xl bg-[#0B0E17] border border-white/15 p-2.5 text-xs text-white focus:border-[#09ADEF] focus:outline-none leading-relaxed"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={scheduleOption}
                          onChange={e =>
                            setScheduleOption(
                              e.target.value as 'NOW' | 'DAY_2' | 'DAY_5' | 'DAY_12' | 'DAY_30'
                            )
                          }
                          className="rounded-lg bg-[#0B0E17] border border-white/15 px-2.5 py-1.5 text-xs text-neutral-200 focus:border-[#09ADEF] focus:outline-none"
                        >
                          <option value="NOW">Send Now</option>
                          <option value="DAY_2">Schedule · Day 2</option>
                          <option value="DAY_5">Schedule · Day 5</option>
                          <option value="DAY_12">Schedule · Day 12</option>
                          <option value="DAY_30">Schedule · Day 30</option>
                        </select>

                        <div className="flex items-center gap-2">
                          {composerText && (
                            <button
                              type="button"
                              onClick={() => handleCopy('composer-copy', composerText)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-neutral-300 inline-flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === 'composer-copy' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedId === 'composer-copy' ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}

                          <button
                            type="submit"
                            disabled={isSending || !composerText.trim()}
                            className="btn-2mm px-4 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{scheduleOption === 'NOW' ? 'Send' : 'Schedule'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
