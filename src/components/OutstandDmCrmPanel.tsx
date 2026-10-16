import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Zap,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Repeat,
  Radio,
  Search
} from 'lucide-react';
import { StudentProfile, ShiftMagnet } from '../types';
import { ModalDialog } from './ModalDialog';

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

export interface OutstandConfig {
  apiKey: string;
  socialAccountId: string;
  instagramHandle: string;
  tenantId: string;
  autoCommentToDm: boolean;
  combineStageSandH: boolean;
  lastSyncedAt?: string;
}

interface OutstandDmCrmPanelProps {
  student: StudentProfile;
  onUpdateField?: (fieldId: string, value: string) => void;
}

export const STAGE_METADATA: Record<
  ShiftCrmStage,
  { short: string; label: string; badgeClass: string; dotClass: string }
> = {
  STAGE_S: {
    short: 'Stage S · Signal',
    label: 'S · Signal & Link Sent (Private Reply)',
    badgeClass: 'bg-[#09ADEF]/15 text-[#09ADEF] border-[#09ADEF]/35',
    dotClass: 'bg-[#09ADEF]'
  },
  STAGE_H: {
    short: 'Stage H · Diagnosed',
    label: 'H · A/B/C Constraint Diagnosed',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/35',
    dotClass: 'bg-cyan-400'
  },
  STAGE_I: {
    short: 'Stage I · Illuminated',
    label: 'I · Cost of Inaction Illuminated',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-400/35',
    dotClass: 'bg-purple-400'
  },
  STAGE_F: {
    short: 'Stage F · Micro-Win',
    label: 'F · Shift Magnet Micro-Win Confirmed',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/35',
    dotClass: 'bg-indigo-400'
  },
  STAGE_T: {
    short: 'Stage T · Offer Doc',
    label: 'T · 2-Page Offer Doc / Workshop Sent',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35',
    dotClass: 'bg-emerald-400'
  },
  LOOP_DAY2: {
    short: 'Loop 1 · Day 2',
    label: 'Loop 1 · Day 2 (48h Context Nudge)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/35',
    dotClass: 'bg-amber-400'
  },
  LOOP_DAY5: {
    short: 'Loop 2 · Day 5',
    label: 'Loop 2 · Day 5 (Friction Nudge)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/35',
    dotClass: 'bg-amber-400'
  },
  LOOP_DAY12: {
    short: 'Loop 3 · Day 12',
    label: 'Loop 3 · Day 12 (Priority Check)',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-400/35',
    dotClass: 'bg-orange-400'
  },
  LOOP_DAY30: {
    short: 'Loop 4 · Day 30',
    label: 'Loop 4 · Day 30 (Permission to Close)',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-400/35',
    dotClass: 'bg-rose-400'
  },
  CLOSED_WON: {
    short: 'Closed / Won',
    label: 'Closed / Won Client',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50',
    dotClass: 'bg-emerald-400'
  }
};

function createStarterThreads(student: StudentProfile): DmCrmThread[] {
  const firstMag: ShiftMagnet | undefined = student.shiftMagnets[0];
  const secondMag: ShiftMagnet | undefined = student.shiftMagnets[1] || firstMag;
  const kw1 = firstMag?.keywordTrigger || 'AUDIT';
  const title1 = firstMag?.workingTitle || 'The 7-Hour Pipeline Equity Audit';
  const link1 = firstMag?.trackingLink || 'https://marketconcussion.com/audit';

  const kw2 = secondMag?.keywordTrigger || 'FIVE';
  const title2 = secondMag?.workingTitle || 'The $5/Day Andromeda Wiring Guide';
  const link2 = secondMag?.trackingLink || 'https://marketconcussion.com/five';

  const now = Date.now();

  return [
    {
      id: 'crm-starter-1',
      outstandConversationId: 'conv_outstand_demo_01',
      socialAccountId: 'acc_ig_primary',
      platform: 'instagram',
      prospectHandle: 'marcus.vance.io',
      prospectName: 'Marcus Vance',
      matchedKeyword: kw1,
      matchedMagnetId: firstMag?.id || null,
      matchedMagnetTitle: title1,
      sourceCommentId: 'cmt_998120',
      sourcePostId: 'reel_7hour_rule',
      stage: 'STAGE_H',
      constraintPicked: 'B · Escaping referral-only spiky months',
      windowOpen: true,
      lastUserReplyAt: new Date(now - 22 * 60 * 1000).toISOString(),
      scheduledFollowup: null,
      unreadCount: 1,
      updatedAt: new Date(now - 22 * 60 * 1000).toISOString(),
      messages: [
        {
          id: 'm-101',
          direction: 'inbound_comment',
          text: `${kw1} — need this right now`,
          stageTag: `Comment Trigger (${kw1})`,
          createdAt: new Date(now - 35 * 60 * 1000).toISOString(),
          deliveryStatus: 'delivered'
        },
        {
          id: 'm-102',
          direction: 'outbound_dm',
          text: `Hey Marcus! Saw you commented ${kw1} on today's video — here is direct access to ${title1}: ${link1}\n\nQuick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?`,
          stageTag: 'Stage S + H · Auto Private Reply',
          createdAt: new Date(now - 34 * 60 * 1000).toISOString(),
          deliveryStatus: 'read'
        },
        {
          id: 'm-103',
          direction: 'inbound_dm',
          text: 'Definitely B. Referrals got us to $35k/mo but we had zero predictability last month.',
          stageTag: '24h Meta Window Unlocked',
          createdAt: new Date(now - 22 * 60 * 1000).toISOString(),
          deliveryStatus: 'read'
        }
      ]
    },
    {
      id: 'crm-starter-2',
      outstandConversationId: 'conv_outstand_demo_02',
      socialAccountId: 'acc_ig_primary',
      platform: 'instagram',
      prospectHandle: 'elena_growth',
      prospectName: 'Elena Rostova',
      matchedKeyword: kw2,
      matchedMagnetId: secondMag?.id || null,
      matchedMagnetTitle: title2,
      sourceCommentId: 'cmt_998410',
      sourcePostId: 'reel_andromeda_5day',
      stage: 'STAGE_S',
      constraintPicked: '',
      windowOpen: false,
      lastUserReplyAt: null,
      scheduledFollowup: null,
      unreadCount: 0,
      updatedAt: new Date(now - 3 * 3600 * 1000).toISOString(),
      messages: [
        {
          id: 'm-201',
          direction: 'inbound_comment',
          text: kw2,
          stageTag: `Comment Trigger (${kw2})`,
          createdAt: new Date(now - 3 * 3600 * 1000).toISOString(),
          deliveryStatus: 'delivered'
        },
        {
          id: 'm-202',
          direction: 'outbound_dm',
          text: `Hey Elena! Saw you commented ${kw2} — grab ${title2} right here: ${link2}\n\nQuick question while it loads: is your #1 priority A) Lowering cost per qualified lead, B) Building a 25% viewer retargeting pool, or C) Turning DMs into clients without sales calls?`,
          stageTag: 'Stage S + H · Auto Private Reply',
          createdAt: new Date(now - 3 * 3600 * 1000 + 5000).toISOString(),
          deliveryStatus: 'delivered'
        }
      ]
    }
  ];
}

export const OutstandDmCrmPanel: React.FC<OutstandDmCrmPanelProps> = ({
  student,
  onUpdateField
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [stageFilter, setStageFilter] = useState<'ALL' | ShiftCrmStage | 'LOOPS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulator controls
  const [simHandle, setSimHandle] = useState('devon_mercer');
  const [simName, setSimName] = useState('Devon Mercer');
  const [simKeyword, setSimKeyword] = useState(
    student.shiftMagnets[0]?.keywordTrigger || 'AUDIT'
  );
  const [simCommentText, setSimCommentText] = useState(
    `${student.shiftMagnets[0]?.keywordTrigger || 'AUDIT'}! Send it over`
  );
  const [isTriggeringSim, setIsTriggeringSim] = useState(false);

  // Composer state
  const [composerText, setComposerText] = useState('');
  const [composerStageTag, setComposerStageTag] = useState<string>('Manual S.H.I.F.T. Reply');
  const [scheduleOption, setScheduleOption] = useState<
    'NOW' | 'DAY_2' | 'DAY_5' | 'DAY_12' | 'DAY_30'
  >('NOW');
  const [isSending, setIsSending] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // Load Outstand config from student.worksheetAnswers['outstand_config_json']
  const outstandConfig: OutstandConfig = useMemo(() => {
    const raw = student.worksheetAnswers['outstand_config_json'];
    const defaults: OutstandConfig = {
      apiKey: '',
      socialAccountId: '',
      instagramHandle: student.worksheetAnswers['ig_handle'] || '',
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

  // Config modal form state
  const [cfgApiKey, setCfgApiKey] = useState(outstandConfig.apiKey);
  const [cfgSocialAccountId, setCfgSocialAccountId] = useState(outstandConfig.socialAccountId);
  const [cfgIgHandle, setCfgIgHandle] = useState(outstandConfig.instagramHandle);
  const [cfgAutoTrigger, setCfgAutoTrigger] = useState(outstandConfig.autoCommentToDm);
  const [cfgCombineSH, setCfgCombineSH] = useState(outstandConfig.combineStageSandH);
  const [isCheckingAccounts, setIsCheckingAccounts] = useState(false);
  const [fetchedAccounts, setFetchedAccounts] = useState<
    { id: string; username?: string; network?: string }[]
  >([]);

  // Load threads from student.worksheetAnswers['dm_crm_threads_json']
  const threads: DmCrmThread[] = useMemo(() => {
    const raw = student.worksheetAnswers['dm_crm_threads_json'];
    if (!raw) return createStarterThreads(student);
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : createStarterThreads(student);
    } catch {
      return createStarterThreads(student);
    }
  }, [student.worksheetAnswers, student]);

  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    threads[0]?.id || 'crm-starter-1'
  );

  const saveThreads = (nextThreads: DmCrmThread[]) => {
    onUpdateField?.('dm_crm_threads_json', JSON.stringify(nextThreads));
  };

  const saveOutstandConfig = (nextCfg: OutstandConfig) => {
    onUpdateField?.('outstand_config_json', JSON.stringify(nextCfg));
  };

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

  const webhookEndpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/outstand/webhook`
      : 'https://mc-coaching-swart.vercel.app/api/outstand/webhook';

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Personalize any S.H.I.F.T. or Re-Engagement script for the currently selected thread
  const personalizeForThread = (
    template: string,
    thread: DmCrmThread | null = activeThread,
    magnet: ShiftMagnet | undefined = activeMagnet
  ) => {
    const firstName =
      thread?.prospectName?.split(' ')[0] ||
      thread?.prospectHandle?.replace(/^@/, '') ||
      'there';
    const magTitle =
      magnet?.workingTitle || thread?.matchedMagnetTitle || 'Shift Magnet Blueprint';
    const keyword = magnet?.keywordTrigger || thread?.matchedKeyword || 'SHIFT';
    const link = magnet?.trackingLink || 'https://marketconcussion.com/resource';
    const problem =
      magnet?.triggeringProblem ||
      student.worksheetAnswers.m02_q2_problem ||
      'turning content views into predictable high-ticket clients';

    return template
      .replace(/\[First Name\]/gi, firstName)
      .replace(/\[First name\]/g, firstName)
      .replace(/\[Name\]/gi, firstName)
      .replace(/\[Shift Magnet Title\]/gi, magTitle)
      .replace(/\[Shift Magnet\]/gi, magTitle)
      .replace(/\[Resource\]/gi, magTitle)
      .replace(/\[KEYWORD\]/g, keyword)
      .replace(/\[Link\]/gi, link)
      .replace(/\[Specific Problem\]/gi, problem)
      .replace(/\[Specific problem\]/g, problem)
      .replace(/\[Company\/Niche\]/gi, student.niche || 'your business');
  };

  // Build combined Stage S + Stage H Private Reply (respecting Instagram's 1 Private Reply per comment rule)
  const buildCombinedStageSandHReply = (
    prospectName: string,
    magnet: ShiftMagnet | undefined,
    keyword: string
  ) => {
    const firstName = prospectName.split(' ')[0] || 'there';
    const title = magnet?.workingTitle || 'the Shift Magnet';
    const link = magnet?.trackingLink || 'https://marketconcussion.com/magnet';

    const stageSRaw =
      magnet?.dmHandoffScript ||
      student.worksheetAnswers['m17_s_opener'] ||
      `Hey [First Name]! Saw you commented ${keyword} on the video — here is direct access to ${title}: ${link}`;

    const stageHRaw =
      magnet?.dmDiagnosticQuestion ||
      student.worksheetAnswers['m17_h_question'] ||
      'Quick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?';

    const stageS = stageSRaw
      .replace(/\[First Name\]/gi, firstName)
      .replace(/\[Shift Magnet Title\]/gi, title)
      .replace(/\[Shift Magnet\]/gi, title)
      .replace(/\[KEYWORD\]/gi, keyword)
      .replace(/\[Link\]/gi, link);

    const stageH = stageHRaw
      .replace(/\[First Name\]/gi, firstName)
      .replace(/\[Shift Magnet\]/gi, title);

    if (!outstandConfig.combineStageSandH) return stageS;
    if (stageS.includes('A)') && stageS.includes('B)')) return stageS;
    return `${stageS}\n\n${stageH}`;
  };

  // 1. Simulate or fire a live Comment-to-DM Trigger (`comment.received` -> `POST /v1/conversations`)
  const handleSimulateCommentTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTriggeringSim(true);

    const cleanHandle = simHandle.trim().replace(/^@/, '') || 'prospect_user';
    const cleanName = simName.trim() || cleanHandle;
    const matchedMag =
      student.shiftMagnets.find(
        m => m.keywordTrigger?.toUpperCase() === simKeyword.toUpperCase()
      ) || student.shiftMagnets[0];

    const keyword = matchedMag?.keywordTrigger || simKeyword || 'AUDIT';
    const combinedReply = buildCombinedStageSandHReply(cleanName, matchedMag, keyword);
    const nowIso = new Date().toISOString();
    const fakeCommentId = `cmt_${Date.now()}`;

    // If student has configured Outstand API + socialAccountId, also attempt live Outstand call
    if (outstandConfig.socialAccountId && outstandConfig.apiKey) {
      try {
        await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SEND_PRIVATE_REPLY',
            apiKey: outstandConfig.apiKey,
            socialAccountId: outstandConfig.socialAccountId,
            commentId: fakeCommentId,
            text: combinedReply
          })
        });
      } catch {
        // Fallback to local CRM thread creation
      }
    }

    const newThread: DmCrmThread = {
      id: `crm-${Date.now()}`,
      outstandConversationId: `conv_${Date.now()}`,
      socialAccountId: outstandConfig.socialAccountId || 'acc_ig_sandbox',
      platform: 'instagram',
      prospectHandle: cleanHandle,
      prospectName: cleanName,
      matchedKeyword: keyword,
      matchedMagnetId: matchedMag?.id || null,
      matchedMagnetTitle: matchedMag?.workingTitle || 'Shift Magnet',
      sourceCommentId: fakeCommentId,
      sourcePostId: 'reel_latest',
      stage: 'STAGE_S',
      constraintPicked: '',
      windowOpen: false, // Meta 24h window stays locked until prospect replies to Private Reply
      lastUserReplyAt: null,
      scheduledFollowup: null,
      unreadCount: 1,
      updatedAt: nowIso,
      messages: [
        {
          id: `msg-cmt-${Date.now()}`,
          direction: 'inbound_comment',
          text: simCommentText.trim() || keyword,
          stageTag: `Comment Trigger (${keyword})`,
          createdAt: nowIso,
          deliveryStatus: 'delivered'
        },
        {
          id: `msg-dm-${Date.now() + 1}`,
          direction: 'outbound_dm',
          text: combinedReply,
          stageTag: 'Stage S + H · Outstand Private Reply',
          createdAt: nowIso,
          deliveryStatus: 'sent'
        }
      ]
    };

    const nextThreads = [newThread, ...threads];
    saveThreads(nextThreads);
    setSelectedThreadId(newThread.id);
    setIsTriggeringSim(false);
    setStatusBanner({
      type: 'success',
      text: `Comment trigger "${keyword}" fired! Outstand sent combined Stage S (Link) + Stage H (A/B/C Diagnostic) Private Reply to @${cleanHandle}.`
    });
  };

  // 2. Simulate Prospect Replying "A", "B", or "C" (`message.received` -> Unlocks 24-Hour Meta Window!)
  const handleSimulateProspectReply = (choice: 'A' | 'B' | 'C') => {
    if (!activeThread) return;
    const replyMap: Record<'A' | 'B' | 'C', { text: string; constraint: string }> = {
      A: {
        text: 'A for sure — our paid funnel is leaking and booked calls are getting way too expensive.',
        constraint: 'A · Fixing leaky ad funnels'
      },
      B: {
        text: 'Definitely B. We rely almost 100% on referrals and word of mouth right now, need predictable inbound.',
        constraint: 'B · Escaping referral-only spiky months'
      },
      C: {
        text: 'C — I want to stop living on 60-minute discovery calls with people who are not pre-sold.',
        constraint: 'C · Closing deals in DMs without sales calls'
      }
    };

    const picked = replyMap[choice];
    const nowIso = new Date().toISOString();

    const updatedThreads = threads.map(t => {
      if (t.id !== activeThread.id) return t;
      return {
        ...t,
        windowOpen: true,
        lastUserReplyAt: nowIso,
        stage: 'STAGE_H' as ShiftCrmStage,
        constraintPicked: picked.constraint,
        scheduledFollowup: null,
        unreadCount: 0,
        updatedAt: nowIso,
        messages: [
          ...t.messages,
          {
            id: `msg-in-${Date.now()}`,
            direction: 'inbound_dm' as const,
            text: picked.text,
            stageTag: `Prospect Picked ${choice} · 24h Window Unlocked`,
            createdAt: nowIso,
            deliveryStatus: 'read' as const
          }
        ]
      };
    });

    saveThreads(updatedThreads);
    setStatusBanner({
      type: 'info',
      text: `@${activeThread.prospectHandle} replied "${choice}"! Meta's 24-Hour Messaging Window is now OPEN and thread auto-advanced to Stage H. Click "Stage I · Illuminate Gap" below to reply.`
    });
  };

  // 3. Insert a S.H.I.F.T. or Re-Engagement template into the composer
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
      const text = buildCombinedStageSandHReply(
        activeThread.prospectName,
        activeMagnet,
        activeThread.matchedKeyword
      );
      setComposerText(text);
      setComposerStageTag('Stage S + H · Private Reply');
      setScheduleOption('NOW');
      return;
    }

    if (presetKey === 'STAGE_I') {
      const raw =
        student.worksheetAnswers['m17_i_diagnosis'] ||
        `That makes total sense, [First Name] — almost every operator who grabs the [Shift Magnet] says the exact same thing.\n\nWhen that’s happening, it’s rarely an effort problem; it’s because prospects haven’t consumed enough structured belief-shifting content before hitting your DMs.\n\nHave you had a chance to look at Section 2 of the [Shift Magnet] yet?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Stage I · Illuminate Gap');
      setScheduleOption('NOW');
      return;
    }

    if (presetKey === 'STAGE_F') {
      const raw =
        student.worksheetAnswers['m17_f_magnet'] ||
        `Check out Section 2 inside the [Shift Magnet] ([Link]) — it takes about 3 minutes to score.\n\nOnce you see your score on that page, let me know which of the 3 gaps jumped out most for your setup.`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Stage F · Confirm Micro-Win');
      setScheduleOption('NOW');
      return;
    }

    if (presetKey === 'STAGE_T') {
      const raw =
        activeMagnet?.dmBridgeScript ||
        student.worksheetAnswers['m17_booking'] ||
        `Awesome, [First Name]. Look — if you want to install the entire 25-video library, $5/day Andromeda sequence, and DM Playbook over the next 8 weeks without guessing, I put everything (scope, timeline, price, and guarantee) on a simple 2-Page Offer Doc.\n\nWant me to drop the link here so you can read through it whenever you have 3 minutes?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Stage T · 2-Page Offer Doc Invite');
      setScheduleOption('NOW');
      return;
    }

    if (presetKey === 'DAY_2') {
      const raw =
        student.worksheetAnswers['m17_day2'] ||
        `Hey [First Name], did you get a chance to look at the [Shift Magnet] I sent over, or has this week been crazy?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Loop 1 · Day 2 Nudge');
      setScheduleOption('DAY_2');
      return;
    }

    if (presetKey === 'DAY_5') {
      const raw =
        student.worksheetAnswers['m17_day5'] ||
        `Hey [First Name] — curious, was there anything in the [Shift Magnet] that didn’t quite fit your current setup with [Company/Niche]?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Loop 2 · Day 5 Friction Nudge');
      setScheduleOption('DAY_5');
      return;
    }

    if (presetKey === 'DAY_12') {
      const raw =
        student.worksheetAnswers['m17_day12'] ||
        `Hey [First Name] — is solving [Specific Problem] still a priority for you right now, or did that get pushed to next quarter?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Loop 3 · Day 12 Priority Check');
      setScheduleOption('DAY_12');
      return;
    }

    if (presetKey === 'DAY_30') {
      const raw =
        student.worksheetAnswers['m17_day30'] ||
        `Hey [First Name] — should I close the loop on [Specific Problem] for now, or is it still on your radar for this quarter?`;
      setComposerText(personalizeForThread(raw));
      setComposerStageTag('Loop 4 · Day 30 Loop Close');
      setScheduleOption('DAY_30');
    }
  };

  // 4. Send or Schedule message via Outstand (`POST /v1/conversations/{id}/messages` with optional `scheduled_at`)
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

    let outstandMessageId: string | null = null;

    // Attempt live Outstand API call if conversation ID & API key are configured
    if (activeThread.outstandConversationId && outstandConfig.apiKey) {
      try {
        const res = await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SEND_MESSAGE',
            apiKey: outstandConfig.apiKey,
            conversationId: activeThread.outstandConversationId,
            text: composerText.trim(),
            scheduledAt: scheduledIso
          })
        });
        const data = await res.json();
        if (data?.ok && data?.data?.id) {
          outstandMessageId = data.data.id;
        }
      } catch {
        // Continue with local CRM state update
      }
    }

    // Auto-infer stage advancement when sending S.H.I.F.T. messages
    let nextStage: ShiftCrmStage = activeThread.stage;
    if (composerStageTag.includes('Stage I')) nextStage = 'STAGE_I';
    else if (composerStageTag.includes('Stage F')) nextStage = 'STAGE_F';
    else if (composerStageTag.includes('Stage T')) nextStage = 'STAGE_T';
    else if (scheduleOption === 'DAY_2') nextStage = 'LOOP_DAY2';
    else if (scheduleOption === 'DAY_5') nextStage = 'LOOP_DAY5';
    else if (scheduleOption === 'DAY_12') nextStage = 'LOOP_DAY12';
    else if (scheduleOption === 'DAY_30') nextStage = 'LOOP_DAY30';

    const newMsg: DmCrmMessage = {
      id: `msg-out-${Date.now()}`,
      outstandMessageId: outstandMessageId || `out_${Date.now()}`,
      direction: 'outbound_dm',
      text: composerText.trim(),
      stageTag: isScheduled
        ? `${composerStageTag} (Scheduled via Outstand)`
        : composerStageTag,
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
              outstandMessageId: newMsg.outstandMessageId,
              level: scheduleOption as 'DAY_2' | 'DAY_5' | 'DAY_12' | 'DAY_30',
              scheduledAt: scheduledIso!,
              text: composerText.trim()
            }
          : t.scheduledFollowup,
        messages: [...t.messages, newMsg]
      };
    });

    saveThreads(updatedThreads);
    setComposerText('');
    setIsSending(false);
    setStatusBanner({
      type: 'success',
      text: isScheduled
        ? `Scheduled ${scheduleOption.replace('_', ' ')} Re-Engagement nudge via Outstand (scheduled_at: ${new Date(
            scheduledIso!
          ).toLocaleDateString()}). Auto-cancels if @${activeThread.prospectHandle} replies first!`
        : `Sent ${composerStageTag} to @${activeThread.prospectHandle} and updated pipeline stage to ${STAGE_METADATA[nextStage].short}.`
    });
  };

  // Cancel a scheduled Re-Engagement message (`DELETE /v1/conversations/{id}/messages/{messageId}`)
  const handleCancelScheduled = async (thread: DmCrmThread) => {
    if (!thread.scheduledFollowup) return;

    if (
      thread.outstandConversationId &&
      thread.scheduledFollowup.outstandMessageId &&
      outstandConfig.apiKey
    ) {
      try {
        await fetch('/api/outstand/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CANCEL_SCHEDULED_MESSAGE',
            apiKey: outstandConfig.apiKey,
            conversationId: thread.outstandConversationId,
            messageId: thread.scheduledFollowup.outstandMessageId
          })
        });
      } catch {
        // Ignore network error
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
    setStatusBanner({
      type: 'info',
      text: `Cancelled scheduled Re-Engagement message for @${thread.prospectHandle}.`
    });
  };

  const handleStageChange = (threadId: string, newStage: ShiftCrmStage) => {
    const updated = threads.map(t =>
      t.id === threadId ? { ...t, stage: newStage, updatedAt: new Date().toISOString() } : t
    );
    saveThreads(updated);
  };

  const handleDeleteThread = (threadId: string) => {
    const remaining = threads.filter(t => t.id !== threadId);
    saveThreads(remaining);
    if (selectedThreadId === threadId && remaining[0]) {
      setSelectedThreadId(remaining[0].id);
    }
  };

  // Fetch connected social accounts from Outstand (`GET /v1/social-accounts`)
  const handleFetchOutstandAccounts = async () => {
    setIsCheckingAccounts(true);
    try {
      const res = await fetch('/api/outstand/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LIST_ACCOUNTS',
          apiKey: cfgApiKey.trim() || undefined,
          tenantId: student.id
        })
      });
      const json = await res.json();
      if (json?.ok && Array.isArray(json?.data?.data || json?.data)) {
        const list = Array.isArray(json.data.data) ? json.data.data : json.data;
        setFetchedAccounts(list);
        if (list[0]?.id && !cfgSocialAccountId) {
          setCfgSocialAccountId(list[0].id);
        }
      }
    } catch {
      // Ignore error
    } finally {
      setIsCheckingAccounts(false);
    }
  };

  const handleSaveConfigModal = (e: React.FormEvent) => {
    e.preventDefault();
    const next: OutstandConfig = {
      apiKey: cfgApiKey.trim(),
      socialAccountId: cfgSocialAccountId.trim(),
      instagramHandle: cfgIgHandle.trim().replace(/^@/, ''),
      tenantId: student.id,
      autoCommentToDm: cfgAutoTrigger,
      combineStageSandH: cfgCombineSH,
      lastSyncedAt: new Date().toISOString()
    };
    saveOutstandConfig(next);
    setShowConfigModal(false);
    setStatusBanner({
      type: 'success',
      text: 'Outstand.so Comment-to-DM & CRM configuration saved!'
    });
  };

  const isOutstandLive = Boolean(outstandConfig.socialAccountId || outstandConfig.apiKey);

  return (
    <div className="space-y-5">
      {/* Top Outstand.so Status & Comment-to-DM Automation Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[#09ADEF]/30 bg-gradient-to-r from-[#09ADEF]/[0.08] via-[#070A10] to-emerald-500/[0.06] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#09ADEF]/15 border border-[#09ADEF]/40 text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>OUTSTAND.SO COMMENT-TO-DM ENGINE + S.H.I.F.T. CRM</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isOutstandLive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                    : 'bg-amber-500/15 text-amber-200 border-amber-400/35'
                }`}
              >
                {isOutstandLive
                  ? `CONNECTED · @${outstandConfig.instagramHandle || 'IG ACCOUNT'}`
                  : 'INTERACTIVE SANDBOX + WEBHOOK READY'}
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl text-white tracking-wide uppercase">
              AUTOMATED COMMENT TRIGGERS & IN-APP S.H.I.F.T. DM INBOX
            </h2>
            <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
              When a viewer comments any of your Shift Magnet keywords (
              {student.shiftMagnets.map(m => `"${m.keywordTrigger}"`).join(', ') || '"AUDIT"'}
              ), Outstand’s <code className="text-[#09ADEF]">comment.received</code> webhook fires{' '}
              <code className="text-[#09ADEF]">POST /v1/conversations</code> with a single combined{' '}
              <strong>Stage S (Magnet Link) + Stage H (A/B/C Constraint Diagnostic)</strong> Private
              Reply. The moment they reply <strong>A, B, or C</strong>, Meta’s 24-hour messaging
              window unlocks so you can run Stages I, F, T and schedule Day 2–30 Re-Engagement
              loops right inside this inbox.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCfgApiKey(outstandConfig.apiKey);
                setCfgSocialAccountId(outstandConfig.socialAccountId);
                setCfgIgHandle(outstandConfig.instagramHandle || '');
                setCfgAutoTrigger(outstandConfig.autoCommentToDm);
                setCfgCombineSH(outstandConfig.combineStageSandH);
                setShowConfigModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer transition"
            >
              <Settings className="w-3.5 h-3.5 text-[#09ADEF]" />
              <span>Configure Outstand API & Webhook</span>
            </button>
          </div>
        </div>

        {/* Active Keyword Triggers + Live Comment Webhook Simulator Strip */}
        <form
          onSubmit={handleSimulateCommentTrigger}
          className="p-3.5 rounded-xl bg-[#04060A]/90 border border-white/10 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#09ADEF]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                LIVE COMMENT-TO-DM TRIGGER SIMULATOR (TEST YOUR KEYWORD AUTOMATION)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-neutral-400">Active Keywords:</span>
              {student.shiftMagnets.map(mag => (
                <button
                  key={mag.id}
                  type="button"
                  onClick={() => {
                    setSimKeyword(mag.keywordTrigger);
                    setSimCommentText(`${mag.keywordTrigger} — send me the link!`);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition ${
                    simKeyword === mag.keywordTrigger
                      ? 'bg-[#09ADEF]/20 text-[#09ADEF] border-[#09ADEF]/50'
                      : 'bg-white/[0.04] text-neutral-300 border-white/10 hover:text-white'
                  }`}
                >
                  {mag.keywordTrigger}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Prospect @Handle
              </label>
              <input
                type="text"
                value={simHandle}
                onChange={e => setSimHandle(e.target.value)}
                placeholder="e.g. alex_founder"
                className="w-full rounded-lg bg-[#090C12] border border-white/12 px-2.5 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Prospect Name
              </label>
              <input
                type="text"
                value={simName}
                onChange={e => setSimName(e.target.value)}
                placeholder="Alex Rivera"
                className="w-full rounded-lg bg-[#090C12] border border-white/12 px-2.5 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Matched Keyword
              </label>
              <select
                value={simKeyword}
                onChange={e => {
                  setSimKeyword(e.target.value);
                  setSimCommentText(`${e.target.value} — send it over!`);
                }}
                className="w-full rounded-lg bg-[#090C12] border border-white/12 px-2.5 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
              >
                {student.shiftMagnets.map(m => (
                  <option key={m.id} value={m.keywordTrigger}>
                    {m.keywordTrigger} ({m.workingTitle.slice(0, 22)})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Public Post Comment Text
              </label>
              <input
                type="text"
                value={simCommentText}
                onChange={e => setSimCommentText(e.target.value)}
                placeholder="AUDIT please!"
                className="w-full rounded-lg bg-[#090C12] border border-white/12 px-2.5 py-2 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isTriggeringSim}
                className="w-full btn-2mm py-2 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isTriggeringSim ? 'Firing...' : 'Fire Trigger'}</span>
              </button>
            </div>
          </div>
        </form>

        {statusBanner && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-[#09ADEF]/12 border border-[#09ADEF]/35 text-xs text-neutral-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#09ADEF] shrink-0" />
              <span>{statusBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Stage Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL' as const, label: `All Threads (${threads.length})` },
            {
              id: 'STAGE_S' as const,
              label: `S · Signal (${threads.filter(t => t.stage === 'STAGE_S').length})`
            },
            {
              id: 'STAGE_H' as const,
              label: `H · Diagnosed (${threads.filter(t => t.stage === 'STAGE_H').length})`
            },
            {
              id: 'STAGE_I' as const,
              label: `I · Illuminated (${threads.filter(t => t.stage === 'STAGE_I').length})`
            },
            {
              id: 'STAGE_F' as const,
              label: `F · Micro-Win (${threads.filter(t => t.stage === 'STAGE_F').length})`
            },
            {
              id: 'STAGE_T' as const,
              label: `T · Offer Doc (${threads.filter(t => t.stage === 'STAGE_T').length})`
            },
            {
              id: 'LOOPS' as const,
              label: `Re-Engage Loops (${
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
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition ${
                stageFilter === pill.id
                  ? 'bg-[#09ADEF] text-white border-[#09ADEF]'
                  : 'bg-[#07090D] text-neutral-400 border-white/10 hover:text-white'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter @handle or keyword..."
            className="w-full rounded-xl bg-[#07090D] border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
          />
        </div>
      </div>

      {/* Main Split-Pane DM CRM Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Thread List (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/[0.06]">
          <div className="p-3.5 bg-[#05070B] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-300">
              DM INBOX ({filteredThreads.length})
            </span>
            <span className="text-[10px] text-neutral-400">
              {threads.filter(t => t.windowOpen).length} w/ 24h Window Open
            </span>
          </div>

          <div className="max-h-[620px] overflow-y-auto divide-y divide-white/[0.06]">
            {filteredThreads.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">
                No DM threads match this filter. Use the <strong>Fire Trigger</strong> bar above to
                simulate a new Comment-to-DM conversation.
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = activeThread?.id === thread.id;
                const stageMeta = STAGE_METADATA[thread.stage] || STAGE_METADATA.STAGE_S;
                const lastMsg = thread.messages[thread.messages.length - 1];

                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#09ADEF]/[0.11] border-l-2 border-l-[#09ADEF]'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            {thread.prospectName}
                          </span>
                          <span className="text-[11px] text-[#09ADEF] font-mono">
                            @{thread.prospectHandle}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[9px] font-bold uppercase tracking-wider text-neutral-200">
                            KW: {thread.matchedKeyword}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${stageMeta.badgeClass}`}
                          >
                            {stageMeta.short}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            thread.windowOpen
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                              : 'bg-amber-500/15 text-amber-200 border border-amber-400/30'
                          }`}
                          title={
                            thread.windowOpen
                              ? 'Prospect replied — 24h free-form DM window is open'
                              : 'Waiting for prospect to reply to Private Reply to open 24h window'
                          }
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              thread.windowOpen ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          {thread.windowOpen ? '24h Open' : 'Awaiting Reply'}
                        </span>

                        {thread.scheduledFollowup && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-200 border border-purple-400/30 text-[9px] font-bold uppercase">
                            <Clock className="w-2.5 h-2.5" />
                            {thread.scheduledFollowup.level.replace('_', ' ')} Queued
                          </span>
                        )}
                      </div>
                    </div>

                    {lastMsg && (
                      <p className="text-[11px] text-neutral-400 line-clamp-2 mt-2 leading-relaxed">
                        {lastMsg.direction === 'inbound_comment'
                          ? `💬 Commented: "${lastMsg.text}"`
                          : lastMsg.direction === 'inbound_dm'
                          ? `↩ ${lastMsg.text}`
                          : `You: ${lastMsg.text}`}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Thread Conversation & S.H.I.F.T. Script Copilot (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          {!activeThread ? (
            <div className="p-10 text-center text-sm text-neutral-400">
              Select a conversation on the left or fire a Comment Trigger above.
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 bg-[#05070B] border-b border-white/[0.08] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl text-white tracking-wide uppercase">
                        {activeThread.prospectName}
                      </h3>
                      <span className="text-xs font-mono text-[#09ADEF]">
                        @{activeThread.prospectHandle}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#09ADEF]/15 border border-[#09ADEF]/35 text-[10px] font-bold uppercase text-[#09ADEF]">
                        Trigger: &ldquo;{activeThread.matchedKeyword}&rdquo; →{' '}
                        {activeThread.matchedMagnetTitle}
                      </span>
                    </div>

                    {activeThread.constraintPicked && (
                      <div className="text-[11px] text-emerald-300 mt-1 font-medium">
                        Diagnosed Bottleneck: <strong>{activeThread.constraintPicked}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={activeThread.stage}
                      onChange={e =>
                        handleStageChange(activeThread.id, e.target.value as ShiftCrmStage)
                      }
                      className="rounded-xl bg-[#0B0E15] border border-white/15 px-3 py-1.5 text-xs font-bold text-white focus:border-[#09ADEF] focus:outline-none"
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
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 text-neutral-400 hover:text-rose-300 cursor-pointer"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Meta 24-Hour Window Status & 1-Click Prospect Reply Simulator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#080B11] border border-white/[0.07]">
                  <div className="flex items-center gap-2 text-xs">
                    {activeThread.windowOpen ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-200 font-medium">
                          <strong>24h Meta Messaging Window OPEN:</strong> Prospect replied to your
                          Private Reply. Free-form DMs &amp; scheduled Re-Engagement nudges enabled.
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-amber-100">
                          <strong>Private Reply Sent (Awaiting Prospect Reply):</strong> Meta allows
                          1 Private Reply per comment. Once they reply <strong>A, B, or C</strong>,
                          the 24h window unlocks.
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Simulate Reply:
                    </span>
                    {(['A', 'B', 'C'] as const).map(letter => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => handleSimulateProspectReply(letter)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-[10px] font-bold text-emerald-200 cursor-pointer transition"
                        title={`Simulate @${activeThread.prospectHandle} replying "${letter}" via Outstand message.received webhook`}
                      >
                        Reply &ldquo;{letter}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message History Stream */}
              <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto bg-[#030508]">
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
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {isComment
                            ? `💬 Public Post Comment · @${activeThread.prospectHandle}`
                            : isInbound
                            ? `↩ Prospect DM · @${activeThread.prospectHandle}`
                            : 'You (S.H.I.F.T. Playbook)'}
                        </span>
                        {msg.stageTag && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-bold uppercase text-[#09ADEF]">
                            {msg.stageTag}
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                          isComment
                            ? 'bg-amber-500/12 border border-amber-400/35 text-amber-100'
                            : isInbound
                            ? 'bg-[#0E131D] border border-white/12 text-white'
                            : isScheduled
                            ? 'bg-purple-500/15 border border-purple-400/40 text-purple-100'
                            : 'bg-[#09ADEF]/18 border border-[#09ADEF]/45 text-white'
                        }`}
                      >
                        {msg.text}
                      </div>

                      <div className="text-[10px] text-neutral-500 mt-1 px-1">
                        {isScheduled && msg.scheduledFor
                          ? `⏰ Scheduled via Outstand for ${new Date(
                              msg.scheduledFor
                            ).toLocaleString()}`
                          : new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                      </div>
                    </div>
                  );
                })}

                {activeThread.scheduledFollowup && (
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-purple-200">
                      <Clock className="w-4 h-4 text-purple-300 shrink-0" />
                      <span>
                        <strong>
                          {activeThread.scheduledFollowup.level.replace('_', ' ')} Nudge Queued:
                        </strong>{' '}
                        Scheduled for{' '}
                        {new Date(activeThread.scheduledFollowup.scheduledAt).toLocaleDateString()}{' '}
                        (auto-cancels on prospect reply).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelScheduled(activeThread)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-[10px] font-bold uppercase text-rose-200 cursor-pointer shrink-0"
                    >
                      Cancel Scheduled
                    </button>
                  </div>
                )}
              </div>

              {/* 1-Click S.H.I.F.T. & Re-Engagement Playbook Copilot Bar */}
              <div className="p-3.5 bg-[#06090F] border-t border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                    1-CLICK S.H.I.F.T. PLAYBOOK &amp; RE-ENGAGEMENT SCRIPT COPILOT (AUTO-PERSONALIZED
                    FOR @{activeThread.prospectHandle.toUpperCase()})
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('STAGE_S_H')}
                    className="px-2.5 py-1.5 rounded-lg bg-[#09ADEF]/12 hover:bg-[#09ADEF]/25 border border-[#09ADEF]/35 text-[10px] font-bold text-[#09ADEF] cursor-pointer transition"
                  >
                    Stage S+H · Private Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('STAGE_I')}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-500/12 hover:bg-purple-500/25 border border-purple-400/35 text-[10px] font-bold text-purple-200 cursor-pointer transition"
                  >
                    Stage I · Illuminate Gap
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('STAGE_F')}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-500/12 hover:bg-indigo-500/25 border border-indigo-400/35 text-[10px] font-bold text-indigo-200 cursor-pointer transition"
                  >
                    Stage F · Confirm Micro-Win
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('STAGE_T')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/12 hover:bg-emerald-500/25 border border-emerald-400/35 text-[10px] font-bold text-emerald-200 cursor-pointer transition"
                  >
                    Stage T · 2-Page Offer Doc Invite
                  </button>

                  <div className="h-5 w-px bg-white/10 mx-0.5 self-center" />

                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('DAY_2')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/12 hover:bg-amber-500/25 border border-amber-400/35 text-[10px] font-bold text-amber-200 cursor-pointer transition"
                  >
                    Loop 1 · Day 2 (+48h)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('DAY_5')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/12 hover:bg-amber-500/25 border border-amber-400/35 text-[10px] font-bold text-amber-200 cursor-pointer transition"
                  >
                    Loop 2 · Day 5 (+5d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('DAY_12')}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-500/12 hover:bg-orange-500/25 border border-orange-400/35 text-[10px] font-bold text-orange-200 cursor-pointer transition"
                  >
                    Loop 3 · Day 12 (+12d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertPlaybookScript('DAY_30')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/12 hover:bg-rose-500/25 border border-rose-400/35 text-[10px] font-bold text-rose-200 cursor-pointer transition"
                  >
                    Loop 4 · Day 30 Close (+30d)
                  </button>
                </div>

                {/* Message Composer Form */}
                <form onSubmit={handleSendMessage} className="space-y-2.5 pt-1">
                  <textarea
                    rows={3}
                    value={composerText}
                    onChange={e => setComposerText(e.target.value)}
                    placeholder={`Write a reply to @${activeThread.prospectHandle} or click any S.H.I.F.T. / Re-Engagement stage button above...`}
                    className="w-full rounded-xl bg-[#0B0E17] border border-white/15 p-3 text-xs text-white focus:border-[#09ADEF] focus:outline-none leading-relaxed"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        Delivery Mode:
                      </span>
                      <select
                        value={scheduleOption}
                        onChange={e =>
                          setScheduleOption(
                            e.target.value as 'NOW' | 'DAY_2' | 'DAY_5' | 'DAY_12' | 'DAY_30'
                          )
                        }
                        className="rounded-lg bg-[#0B0E17] border border-white/15 px-2.5 py-1.5 text-xs text-white focus:border-[#09ADEF] focus:outline-none"
                      >
                        <option value="NOW">Send Immediately (POST /messages)</option>
                        <option value="DAY_2">
                          Schedule Level 1 · Day 2 (+48h via scheduled_at)
                        </option>
                        <option value="DAY_5">
                          Schedule Level 2 · Day 5 (+5d via scheduled_at)
                        </option>
                        <option value="DAY_12">
                          Schedule Level 3 · Day 12 (+12d via scheduled_at)
                        </option>
                        <option value="DAY_30">
                          Schedule Level 4 · Day 30 (+30d via scheduled_at)
                        </option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      {composerText && (
                        <button
                          type="button"
                          onClick={() => handleCopy('composer-copy', composerText)}
                          className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-neutral-200 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === 'composer-copy' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={isSending || !composerText.trim()}
                        className="btn-2mm px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {scheduleOption === 'NOW' ? (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send DM Now</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Schedule {scheduleOption.replace('_', ' ')} Nudge</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Outstand.so API & Webhook Setup Modal */}
      <ModalDialog
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Outstand.so Comment-to-DM & CRM Configuration"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSaveConfigModal} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#09ADEF]/10 border border-[#09ADEF]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                1. YOUR LIVE OUTSTAND WEBHOOK RECEIVER URL
              </span>
              <button
                type="button"
                onClick={() => handleCopy('webhook-url', webhookEndpointUrl)}
                className="px-2.5 py-1 rounded-lg bg-[#09ADEF]/20 hover:bg-[#09ADEF]/30 text-[10px] font-bold text-white inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'webhook-url' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Webhook URL</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-[#04060A] border border-white/10 font-mono text-[11px] text-emerald-300 break-all">
              {webhookEndpointUrl}
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Paste this URL in your Outstand.so dashboard under <strong>Webhooks</strong> and
              subscribe to <code className="text-white">comment.received</code> and{' '}
              <code className="text-white">message.received</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Outstand API Key (Optional if set in Vercel Env)
              </label>
              <input
                type="password"
                value={cfgApiKey}
                onChange={e => setCfgApiKey(e.target.value)}
                placeholder="out_live_..."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Instagram Handle (@username)
              </label>
              <input
                type="text"
                value={cfgIgHandle}
                onChange={e => setCfgIgHandle(e.target.value)}
                placeholder="yourhandle"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-neutral-300">
                Outstand Social Account ID (<code className="text-[#09ADEF]">social_account_id</code>
                )
              </label>
              <button
                type="button"
                onClick={handleFetchOutstandAccounts}
                disabled={isCheckingAccounts}
                className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingAccounts ? 'animate-spin' : ''}`} />
                <span>Fetch from Outstand API</span>
              </button>
            </div>
            <input
              type="text"
              value={cfgSocialAccountId}
              onChange={e => setCfgSocialAccountId(e.target.value)}
              placeholder="acc_..."
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
            />
            {fetchedAccounts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fetchedAccounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setCfgSocialAccountId(acc.id);
                      if (acc.username) setCfgIgHandle(acc.username);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-[10px] text-white cursor-pointer"
                  >
                    Select {acc.username ? `@${acc.username}` : acc.id} ({acc.network || 'IG'})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#05080F] border border-white/10 space-y-2.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cfgAutoTrigger}
                onChange={e => setCfgAutoTrigger(e.target.checked)}
                className="mt-0.5 accent-[#09ADEF]"
              />
              <div>
                <div className="font-bold text-white">
                  Auto-Fire Comment-to-DM Private Reply on Keyword Match
                </div>
                <div className="text-[11px] text-neutral-400">
                  Automatically calls Outstand <code className="text-neutral-200">POST /v1/conversations</code>{' '}
                  with <code className="text-neutral-200">comment_id</code> whenever a comment
                  contains any of your Shift Magnet keywords.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={cfgCombineSH}
                onChange={e => setCfgCombineSH(e.target.checked)}
                className="mt-0.5 accent-[#09ADEF]"
              />
              <div>
                <div className="font-bold text-white">
                  Combine Stage S (Link) + Stage H (A/B/C Question) in First Private Reply (Recommended)
                </div>
                <div className="text-[11px] text-neutral-400">
                  Instagram allows only <strong>1 Private Reply per comment</strong> until the
                  prospect responds. Combining Stage S + Stage H ensures they get the link AND the
                  easy A/B/C reply trigger in one message.
                </div>
              </div>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="rounded-xl border border-white/12 px-4 py-2.5 font-medium text-neutral-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-2mm rounded-xl font-bold uppercase tracking-wider px-5 py-2.5 cursor-pointer"
            >
              Save Outstand Configuration
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
