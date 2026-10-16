import React, { useState, useMemo } from 'react';
import {
  Magnet,
  Plus,
  Copy,
  Check,
  MessageSquare,
  Repeat,
  Edit3,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Zap,
  Clock,
  BookOpen,
  Layers,
  UserCheck
} from 'lucide-react';
import { StudentProfile, ShiftMagnet } from '../types';
import { ModalDialog } from './ModalDialog';

interface ShiftMagnetsViewProps {
  student: StudentProfile;
  onAddShiftMagnet: (magnet: ShiftMagnet) => void;
  onUpdateShiftMagnet: (id: string, updates: Partial<ShiftMagnet>) => void;
  onDeleteShiftMagnet?: (id: string) => void;
  onAssignToPendingVideos?: (magnetId: string) => void;
  onUpdateField?: (fieldId: string, value: string) => void;
  onSyncFromLesson21?: () => void;
  onOpenLesson?: (lessonNumber: number) => void;
}

interface DmConversationRecord {
  id: string;
  prospectName: string;
  platform: 'Instagram' | 'LinkedIn' | 'Facebook' | 'YouTube' | 'SMS';
  magnetKeyword: string;
  stage:
    | 'S · Signal Sent'
    | 'H · A/B/C Diagnosed'
    | 'I · Issue Illuminated'
    | 'F · Magnet Delivered'
    | 'T · Offer Doc Sent'
    | 'Loop · Day 2 Nudge'
    | 'Loop · Day 5 Nudge'
    | 'Loop · Day 12 Nudge'
    | 'Loop · Day 30 Close'
    | 'Closed / Won';
  constraintPicked: string;
  notes: string;
  updatedAt: string;
}

const MAGNET_BLUEPRINT_PRESETS: {
  label: string;
  badge: string;
  workingTitle: string;
  keywordTrigger: string;
  deliveryFormat: ShiftMagnet['deliveryFormat'];
  completionTime: string;
  specificAudience: string;
  triggeringProblem: string;
  beliefItShifts: string;
  promiseOneSentence: string;
  sectionsSteps: string;
  bridgeToOffer: string;
  hostedWhere: string;
  publicCommentReply: string;
  dmHandoffScript: string;
  dmDiagnosticQuestion: string;
  dmBridgeScript: string;
}[] = [
  {
    label: '1-Page Audit Scorecard',
    badge: 'CHECKLIST / SCORECARD',
    workingTitle: 'The 7-Hour Pipeline Equity Audit (1-Page Scorecard)',
    keywordTrigger: 'AUDIT',
    deliveryFormat: 'Checklist',
    completionTime: '4 minutes',
    specificAudience: 'B2B Consultants & Agency Operators at $20k–$50k/mo',
    triggeringProblem: 'Posting daily social content that generates likes from peers but $0 in high-ticket pipeline.',
    beliefItShifts: 'More content does not create clients; consumption depth (7 hours on brand) does.',
    promiseOneSentence: 'Score your current content footprint in 4 minutes and see exactly where your pipeline is leaking.',
    sectionsSteps: '1. Current Time-on-Brand Calculator · 2. The 25% Ad Gate Check · 3. DM Handoff & Offer Doc Score',
    bridgeToOffer: 'Once they see their Time-on-Brand gap, invite them to review the 2-Page Super Signature Offer Doc.',
    hostedWhere: 'ManyChat / HighLevel Comment-to-DM Trigger ("AUDIT") + Notion 1-Pager',
    publicCommentReply: 'Just sent the 1-Page Pipeline Audit straight to your DMs! Check your message requests.',
    dmHandoffScript:
      'Hey [First Name]! Saw you commented AUDIT on today’s video — here is the 1-Page Pipeline Equity Scorecard: [Link]',
    dmDiagnosticQuestion:
      'Quick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?',
    dmBridgeScript:
      'Got it — when operators score low on Section 2, it’s almost always because strangers haven’t consumed 7 hours of structured belief-shifting content yet. Want me to send over our 2-Page Offer Doc showing how we install the 25-video engine in 8 weeks?'
  },
  {
    label: '$5/Day Andromeda Wiring Guide',
    badge: 'PDF BLUEPRINT',
    workingTitle: 'The $5/Day Andromeda Invisible List Wiring Guide',
    keywordTrigger: 'FIVE',
    deliveryFormat: 'PDF',
    completionTime: '7 minutes',
    specificAudience: 'Operators tired of $300+ booked call costs on Meta',
    triggeringProblem: 'Complex webinar funnels and landing pages losing 80% of paid traffic on day one.',
    beliefItShifts: 'You do not need complex funnels or big budgets; $5/day goodwill video ads build an Invisible List on platform.',
    promiseOneSentence: 'Copy our exact 6-video sequenced $5/day ad setup that builds a 25% video-viewer retargeting pool.',
    sectionsSteps: '1. Pixel & Custom Audience Naming · 2. The V1–V6 25% Viewer Ladder · 3. The Master Full List Rollup',
    bridgeToOffer: 'Shows how the 6-video ad ladder works, then bridges to building the actual 25 videos together.',
    hostedWhere: 'ManyChat Keyword ("FIVE") + Google Drive / PDF Blueprint',
    publicCommentReply: 'Sent the $5/Day Andromeda Wiring Guide to your DMs! Let me know once you’ve got it.',
    dmHandoffScript:
      'Hey [First Name]! Grab the $5/Day Andromeda Wiring Guide right here: [Link]',
    dmDiagnosticQuestion:
      'Curious — are you currently A) Running paid traffic to a VSL/webinar, B) Boosting posts randomly, or C) 100% organic right now?',
    dmBridgeScript:
      'Makes total sense. The reason $5/day ThruPlay sequencing works so well is every 25% viewer rolls into one permanent Full List. If you want, I can share the 2-Page breakdown of how we wire all 6 sequenced videos for you.'
  },
  {
    label: '2-Page Offer Doc Template',
    badge: 'SILENT CLOSER DOC',
    workingTitle: 'The 2-Page Super Signature Offer Doc Template',
    keywordTrigger: 'DOC',
    deliveryFormat: 'PDF',
    completionTime: '8 minutes',
    specificAudience: 'High-ticket founders who want to close in DMs without 60-minute sales calls',
    triggeringProblem: 'Forcing busy, high-agency buyers onto 60-minute pitch calls that feel like a trap.',
    beliefItShifts: 'Sales calls are a trust verification failure; sophisticated buyers prefer to read a clear 2-page offer doc and self-checkout.',
    promiseOneSentence: 'Draft a 2-page offer document that states scope, price, risk reversal, and a 5-minute next step.',
    sectionsSteps: '1. Problem in Their Words & Named Mechanism · 2. Scope, Timeline & Shared Responsibilities · 3. Risk Reversal & 5-Minute First Step',
    bridgeToOffer: 'Demonstrates the exact 17-point Offer Doc framework from Lesson 24.',
    hostedWhere: 'Google Docs Template + Comment Keyword ("DOC")',
    publicCommentReply: 'Just dropped the 2-Page Offer Doc template in your DMs!',
    dmHandoffScript:
      'Hey [First Name]! Sending over the 2-Page Super Signature Offer Doc template now: [Link]',
    dmDiagnosticQuestion:
      'Quick context check so I can point you to the best example: is your core offer A) Under $3k, B) $3k–$15k, or C) $15k+?',
    dmBridgeScript:
      'At that price point, a 2-Page Offer Doc works best when paired with a Monthly Conversion Workshop and 7 hours of pre-call video equity. Want to see how our own 2-Page Offer Doc is structured?'
  },
  {
    label: 'Custom GPT / Diagnostic Tool',
    badge: 'AI / CUSTOM GPT',
    workingTitle: 'The 2mmShift Hook & Belief-Shift Script Architect GPT',
    keywordTrigger: 'GPT',
    deliveryFormat: 'Custom GPT',
    completionTime: '3 minutes',
    specificAudience: 'Subject-matter experts who freeze when staring at a blank script page',
    triggeringProblem: 'Spending 3 hours scripting a single video that still sounds like a generic lecture.',
    beliefItShifts: 'Great authority videos are not written from scratch; they follow a repeatable 5-Take S.H.I.F.T. beat structure.',
    promiseOneSentence: 'Generate 3 contrarian hooks and a 5-Take phone script in 90 seconds using your own customer stories.',
    sectionsSteps: '1. Paste Customer Question · 2. Select Old vs. New Belief · 3. Output 5-Take Teleprompter Script',
    bridgeToOffer: 'Gives them 1 great script, then shows how our 8-week build installs all 50 daily + 25 long-form scripts.',
    hostedWhere: 'OpenAI Custom GPT Link / ManyChat Keyword ("GPT")',
    publicCommentReply: 'Sent the 2mmShift Script Architect GPT link to your DMs!',
    dmHandoffScript:
      'Hey [First Name]! Here is direct access to the 2mmShift Script Architect GPT: [Link]',
    dmDiagnosticQuestion:
      'When it comes to video right now, is your biggest bottleneck A) Knowing what hooks to say, B) Consistency/time to film, or C) Turning views into actual DM inquiries?',
    dmBridgeScript:
      'That’s the exact bottleneck we built the 10-Minute Daily Studio around. Would it be helpful if I sent over our 2-Page overview of how we load your entire 50-video plan for you?'
  }
];

const DM_MATRIX_DETAILED = [
  {
    letter: 'S',
    stage: 'Signal the Connection',
    timing: 'Within 60 seconds (Automated or Instant Manual)',
    function: 'Re-establish context, deliver the promised Shift Magnet link immediately, and earn the first micro-reply.',
    prospectQuestion: '“Why are you messaging me, and where is the thing I asked for?”',
    asset: 'Promised Shift Magnet Link + Context Reminder',
    result: 'Recognition & Link Delivered',
    whatBreaksIt:
      'Withholding the link behind 4 qualifying questions or sending a 3-paragraph biography about yourself.',
    defaultScript:
      'Hey [First Name]! Saw you commented "[KEYWORD]" on today’s video about [Topic]. Here is direct access to [Shift Magnet Title]: [Link]\n\nLet me know once that opens up for you!',
    workbookFieldId: 'm17_opener'
  },
  {
    letter: 'H',
    stage: 'Highlight the Constraint (A / B / C Diagnostic)',
    timing: 'Immediately after delivery (or 60s after link click)',
    function: 'Diagnose their immediate #1 bottleneck using a zero-friction 3-option multiple choice question.',
    prospectQuestion: '“Which specific problem is mine right now?”',
    asset: 'Three-Option A / B / C Diagnostic Question',
    result: 'Self-Identification',
    whatBreaksIt:
      'Asking open-ended essay questions like "Tell me all about your business goals for Q4?" that require 5 minutes of typing on a phone.',
    defaultScript:
      'Quick question so I can point you to the most relevant part of the [Shift Magnet]: right now, are you focused on:\n\nA) Fixing leaky paid ad funnels ($300+ call costs)\nB) Escaping spiky referral-only months with a daily system\nC) Closing high-ticket clients in DMs without 60-minute sales calls?\n\n(Just reply A, B, or C!)',
    workbookFieldId: 'm17_diagnostic'
  },
  {
    letter: 'I',
    stage: 'Illuminate the Issue',
    timing: 'After they reply A, B, or C',
    function: 'Validate their choice, name the failed workaround they’ve likely tried, and reveal the deeper root cause.',
    prospectQuestion: '“Why hasn’t what I already tried fixed this?”',
    asset: '1-Sentence Root-Cause Reframe + 1 Context Question',
    result: 'Authority & Trust',
    whatBreaksIt:
      'Jumping straight from their "B" reply to "Great, book a 45-minute sales call on my Calendly!" before illuminating the cause.',
    defaultScript:
      'Spot on — 80% of operators we talk to say [A/B/C]. Usually they’ve tried posting more reels or hiring an editor, but the real bottleneck is that strangers haven’t consumed 7 hours of belief-shifting content before entering the inbox.\n\nHow many minutes of structured long-form content do you have live right now if a prospect binged your page tonight?',
    workbookFieldId: 'm17_convo_source'
  },
  {
    letter: 'F',
    stage: 'Form the Next Step',
    timing: 'After they share their current context',
    function: 'Give a tailored, high-value prescription pointing to a specific section of the Shift Magnet or a specific Core Video.',
    prospectQuestion: '“What should I actually do first to fix this?”',
    asset: 'Tailored Prescription (Page/Section of Magnet + 1 Core Video)',
    result: 'Immediate Value',
    whatBreaksIt:
      'Giving generic advice ("Just be more consistent!") instead of a specific, mechanical 2mm Shift they can verify in 5 minutes.',
    defaultScript:
      'Got it. Look at Section 2 of the [Shift Magnet] I just sent — specifically the 25% Ad Gate Check. If you wire just your B1 Documentary and 2 teaching videos at $5/day, every 25% viewer rolls into your Full List automatically.\n\nDoes that distinction between "posting for reach" vs. "building a 25% viewer Full List" make sense for your offer?',
    workbookFieldId: 'm17_convo_resource_rec'
  },
  {
    letter: 'T',
    stage: 'Trigger the Transfer (Offer Doc / Workshop Handoff)',
    timing: 'Once they confirm the prescription makes sense',
    function: 'Bridge naturally from the solved micro-problem to your 2-Page Super Signature Offer Doc, VSL, or Monthly Workshop.',
    prospectQuestion: '“What is the logical next action if I want you to help me install this?”',
    asset: 'Permission-Based Invite to the 2-Page Offer Doc or Live Workshop',
    result: 'Conversion Momentum',
    whatBreaksIt:
      'Hard-pitching or pressuring. Always ask permission to send the 1-to-2 page Offer Doc so they pull the offer toward themselves.',
    defaultScript:
      'Awesome. Look — if you want to install the entire 25-video library, $5/day Andromeda sequence, and DM Playbook over the next 8 weeks without guessing, I put everything (scope, timeline, price, and guarantee) on a simple 2-Page Offer Doc.\n\nWant me to drop the link here so you can read through it whenever you have 3 minutes?',
    workbookFieldId: 'm17_booking'
  }
];

const REENGAGEMENT_LOOPS_DETAILED = [
  {
    id: 'day2',
    level: 'Level 1 · Day 2 (48 Hours)',
    badge: 'LIGHT · ZERO ASK',
    type: 'The Context Nudge',
    workbookFieldId: 'm17_day2',
    triggerCondition: '48 hours after sending the Shift Magnet link or answering their last message with no reply.',
    psychology:
      'Most prospects open DMs while walking, in between meetings, or late at night. A 1-sentence check-in tied to the resource re-opens the mental tab with zero guilt.',
    avoidMistake:
      'Never say "Just following up on my last message!" or ask if they want to book a call.',
    defaultScript:
      'Hey [First Name], did you get a chance to look at the [Shift Magnet] I sent over, or has this week been crazy?',
    scenarioScripts: [
      {
        scenario: 'Scenario A · Sent Shift Magnet Link (No Reply Yet)',
        text: 'Hey [First Name], did you get a chance to open the [Shift Magnet] yet, or has this week been slammed?'
      },
      {
        scenario: 'Scenario B · Asked A/B/C Diagnostic (No Reply Yet)',
        text: 'Hey [First Name] — no rush at all, just making sure the link to [Shift Magnet] worked properly on your end!'
      },
      {
        scenario: 'Scenario C · Sent 2-Page Offer Doc (No Reply Yet)',
        text: 'Hey [First Name], did that 2-Page Offer Doc link open up okay for you?'
      }
    ]
  },
  {
    id: 'day5',
    level: 'Level 2 · Day 5',
    badge: 'NEW VALUE / DIAGNOSTIC · ZERO ASK',
    type: 'The Friction Nudge',
    workbookFieldId: 'm17_day5',
    triggerCondition: '3 days after Level 1 if the thread is still silent.',
    psychology:
      'Shifts the frame from "Did you read it?" to "Did something in it not fit your model?" High-agency operators love correcting or clarifying how their business is different.',
    avoidMistake:
      'Do not send a wall of text. Ask a single diagnostic friction question or drop 1 specific insight.',
    defaultScript:
      'Hey [First Name] — curious, was there anything in the [Shift Magnet] that didn’t quite fit your current setup with [Company/Niche]?',
    scenarioScripts: [
      {
        scenario: 'Scenario A · After Shift Magnet Delivery',
        text: 'Hey [First Name] — was there anything in the [Shift Magnet] that didn’t fit your situation, or did Section 2 hit close to home?'
      },
      {
        scenario: 'Scenario B · Value-Drop Micro-Asset (Alternative)',
        text: 'Hey [First Name], just filmed a 90-second breakdown on [Specific Problem] that pairs with the [Shift Magnet] you grabbed earlier — thought of your setup: [Link]'
      },
      {
        scenario: 'Scenario C · After Sending 2-Page Offer Doc',
        text: 'Hey [First Name] — as you looked over the 2-Page Offer Doc, was there anything in the 8-week scope or timeline that didn’t fit what you’re aiming for this quarter?'
      }
    ]
  },
  {
    id: 'day12',
    level: 'Level 3 · Day 12',
    badge: 'DIRECT PRIORITY CHECK',
    type: 'The Outcome Nudge',
    workbookFieldId: 'm17_day12',
    triggerCondition: '7 days after Level 2 when a prospect has gone quiet mid-evaluation.',
    psychology:
      'Reconnects the thread to the costly problem they originally raised their hand to solve. Respects their time while testing if the priority is still live.',
    avoidMistake:
      'Don’t apologize for messaging ("Sorry to bother you again..."). Speak as a peer architect checking on a priority.',
    defaultScript:
      'Hey [First Name] — is solving [Specific Problem] still a priority for you right now, or did that get pushed to next quarter?',
    scenarioScripts: [
      {
        scenario: 'Scenario A · Tied to Their Original Bottleneck',
        text: 'Hey [First Name] — is fixing [Specific Problem] still a priority this month, or did other fires take over?'
      },
      {
        scenario: 'Scenario B · Tied to the Monthly Workshop Invite',
        text: 'Hey [First Name] — we’re running our live 60-minute implementation workshop on [Topic] next week where we build this out live in the room. Want me to save you a seat?'
      },
      {
        scenario: 'Scenario C · Tied to the 2-Page Offer Doc',
        text: 'Hey [First Name] — are you still looking to install your 7-hour content & DM machine this month, or holding off for now?'
      }
    ]
  },
  {
    id: 'day30',
    level: 'Level 4 · Day 30',
    badge: 'PERMISSION TO CLOSE LOOP',
    type: 'The Clean Loop Close',
    workbookFieldId: 'm17_day30',
    triggerCondition: 'Day 30 of silence. This is the final direct DM nudge before letting the $5/day Full List nurture take over.',
    psychology:
      'People hate losing an open option (loss aversion) and respect operators who don’t chase. Asking permission to close the file regularly triggers a 20–30% immediate response rate.',
    avoidMistake:
      'Never be passive-aggressive. Keep it warm, brief, and leave the door wide open while letting your $5/day retargeting ads do the heavy lifting.',
    defaultScript:
      'Hey [First Name] — should I close the loop on [Specific Problem / Offer Doc] for now, or is it still on your radar for this quarter?',
    scenarioScripts: [
      {
        scenario: 'Scenario A · Classic Permission to Close',
        text: 'Hey [First Name] — should I close the loop on this for now, or are you still planning to tackle [Specific Problem] soon?'
      },
      {
        scenario: 'Scenario B · Warm Handoff to the Monthly Workshop',
        text: 'Hey [First Name] — I’ll close out my note on our thread for now so I’m not clogging your inbox! Whenever timing lines up to install your [Mechanism], just reply "READY" here and we’ll pick right back up.'
      },
      {
        scenario: 'Scenario C · Quarterly Cohort Capacity Check',
        text: 'Hey [First Name] — we’re locking our final spots for this month’s build. Should I close your file for now and check back next quarter?'
      }
    ]
  }
];

export const ShiftMagnetsView: React.FC<ShiftMagnetsViewProps> = ({
  student,
  onAddShiftMagnet,
  onUpdateShiftMagnet,
  onDeleteShiftMagnet,
  onAssignToPendingVideos,
  onUpdateField,
  onSyncFromLesson21,
  onOpenLesson
}) => {
  const [subTab, setSubTab] = useState<'MAGNETS' | 'DM_MATRIX' | 'REENGAGE'>('MAGNETS');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add / Edit Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingMagnetId, setEditingMagnetId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedMagnetId, setExpandedMagnetId] = useState<string | null>(null);

  // Editor Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formKeyword, setFormKeyword] = useState('');
  const [formAudience, setFormAudience] = useState('');
  const [formProblem, setFormProblem] = useState('');
  const [formPromise, setFormPromise] = useState('');
  const [formBelief, setFormBelief] = useState('');
  const [formCompletionTime, setFormCompletionTime] = useState('5 minutes');
  const [formFormat, setFormFormat] = useState<ShiftMagnet['deliveryFormat']>('Checklist');
  const [formSections, setFormSections] = useState('');
  const [formBridge, setFormBridge] = useState('');
  const [formHostedWhere, setFormHostedWhere] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formPublicReply, setFormPublicReply] = useState('');
  const [formScript, setFormScript] = useState('');
  const [formDiagnostic, setFormDiagnostic] = useState('');
  const [formBridgeScript, setFormBridgeScript] = useState('');
  const [formStatus, setFormStatus] = useState<'Live' | 'Draft'>('Live');

  // Interactive DM & Re-Engagement Script Personalizer State
  const [simProspectName, setSimProspectName] = useState('Alex');
  const [simMagnetId, setSimMagnetId] = useState<string>(student.shiftMagnets[0]?.id || '');
  const [simProblem, setSimProblem] = useState('replacing spiky referrals with predictable inbound DMs');

  // New DM Conversation Tracker Form
  const [newConvoProspect, setNewConvoProspect] = useState('');
  const [newConvoPlatform, setNewConvoPlatform] = useState<DmConversationRecord['platform']>('Instagram');
  const [newConvoKeyword, setNewConvoKeyword] = useState(
    student.shiftMagnets[0]?.keywordTrigger || 'AUDIT'
  );
  const [newConvoStage, setNewConvoStage] = useState<DmConversationRecord['stage']>('S · Signal Sent');
  const [newConvoConstraint, setNewConvoConstraint] = useState('B) Escaping referral-only months');
  const [newConvoNotes, setNewConvoNotes] = useState('');

  // Parse saved DM Conversation Log from student.worksheetAnswers['dm_convo_records_json']
  const dmConvoRecords: DmConversationRecord[] = useMemo(() => {
    const raw = student.worksheetAnswers['dm_convo_records_json'];
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [student.worksheetAnswers]);

  const saveDmConvoRecords = (nextRecords: DmConversationRecord[]) => {
    onUpdateField?.('dm_convo_records_json', JSON.stringify(nextRecords));
  };

  // Count how many supporting videos use each magnet
  const videoUsageByMagnetId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of student.supportingVideos) {
      if (v.attachedMagnetId) {
        counts[v.attachedMagnetId] = (counts[v.attachedMagnetId] || 0) + 1;
      }
    }
    return counts;
  }, [student.supportingVideos]);

  const selectedSimMagnet =
    student.shiftMagnets.find(m => m.id === simMagnetId) || student.shiftMagnets[0];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const personalizeText = (template: string) => {
    const name = simProspectName.trim() || '[First Name]';
    const magTitle = selectedSimMagnet?.workingTitle || '[Shift Magnet]';
    const keyword = selectedSimMagnet?.keywordTrigger || 'SHIFT';
    const link = selectedSimMagnet?.trackingLink || 'https://...';
    const prob = simProblem.trim() || '[Specific Problem]';

    return template
      .replace(/\[First Name\]/gi, name)
      .replace(/\[First name\]/g, name)
      .replace(/\[Name\]/gi, name)
      .replace(/\[Shift Magnet Title\]/gi, magTitle)
      .replace(/\[Shift Magnet\]/gi, magTitle)
      .replace(/\[Resource\]/gi, magTitle)
      .replace(/\[KEYWORD\]/g, keyword)
      .replace(/\[Link\]/gi, link)
      .replace(/\[Specific Problem\]/gi, prob)
      .replace(/\[Specific problem\]/g, prob)
      .replace(/\[Company\/Niche\]/gi, student.niche || 'your business');
  };

  const openCreateModal = () => {
    setEditingMagnetId(null);
    setFormTitle('');
    setFormVersion('v1.0');
    setFormKeyword('');
    setFormAudience(student.niche || '');
    setFormProblem('');
    setFormPromise('');
    setFormBelief(student.worksheetAnswers.m02_q4_belief || '');
    setFormCompletionTime('5 minutes');
    setFormFormat('Checklist');
    setFormSections('1. Audit Score · 2. Core Bottleneck Diagnosis · 3. Next Step');
    setFormBridge('Bridges directly to the 2-Page Super Signature Offer Doc.');
    setFormHostedWhere('ManyChat Comment-to-DM Automation + Notion / PDF Link');
    setFormLink('');
    setFormPublicReply('Just sent it straight to your DMs! Check your message requests.');
    setFormScript('');
    setFormDiagnostic(
      'Quick question while you open it: is your #1 priority right now A) More qualified reach, B) Better conversion from views to DMs, or C) Closing without long sales calls?'
    );
    setFormBridgeScript(
      'Got it — Section 2 breaks down why that happens. Want me to send over our 2-Page Offer Doc showing how we install the full system with you?'
    );
    setFormStatus('Live');
    setShowEditorModal(true);
  };

  const openEditModal = (mag: ShiftMagnet) => {
    setEditingMagnetId(mag.id);
    setFormTitle(mag.workingTitle);
    setFormVersion(mag.version || 'v1.0');
    setFormKeyword(mag.keywordTrigger);
    setFormAudience(mag.specificAudience);
    setFormProblem(mag.triggeringProblem);
    setFormPromise(mag.promiseOneSentence);
    setFormBelief(mag.beliefItShifts);
    setFormCompletionTime(mag.completionTime || '5 minutes');
    setFormFormat(mag.deliveryFormat);
    setFormSections(mag.sectionsSteps || '');
    setFormBridge(mag.bridgeToOffer || '');
    setFormHostedWhere(mag.hostedWhere || '');
    setFormLink(mag.trackingLink);
    setFormPublicReply(
      mag.publicCommentReply ||
        `Sent the ${mag.workingTitle} to your DMs! Check your message requests.`
    );
    setFormScript(mag.dmHandoffScript);
    setFormDiagnostic(
      mag.dmDiagnosticQuestion ||
        'Quick question while you open it: are you focused on A) Fixing leaky ad funnels, B) Escaping referral-only months, or C) Closing deals in DMs without sales calls?'
    );
    setFormBridgeScript(
      mag.dmBridgeScript ||
        'When operators hit that bottleneck, it’s almost always a Time-on-Brand gap. Want me to send over our 2-Page Offer Doc showing how we install this in 8 weeks?'
    );
    setFormStatus(mag.status);
    setShowEditorModal(true);
  };

  const applyPresetBlueprint = (preset: (typeof MAGNET_BLUEPRINT_PRESETS)[number]) => {
    setFormTitle(preset.workingTitle);
    setFormKeyword(preset.keywordTrigger);
    setFormFormat(preset.deliveryFormat);
    setFormCompletionTime(preset.completionTime);
    setFormAudience(preset.specificAudience);
    setFormProblem(preset.triggeringProblem);
    setFormBelief(preset.beliefItShifts);
    setFormPromise(preset.promiseOneSentence);
    setFormSections(preset.sectionsSteps);
    setFormBridge(preset.bridgeToOffer);
    setFormHostedWhere(preset.hostedWhere);
    setFormPublicReply(preset.publicCommentReply);
    setFormScript(preset.dmHandoffScript);
    setFormDiagnostic(preset.dmDiagnosticQuestion);
    setFormBridgeScript(preset.dmBridgeScript);
  };

  const handleSaveMagnetForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const cleanKeyword = (formKeyword || 'SHIFT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');

    const payload: Omit<ShiftMagnet, 'id'> = {
      workingTitle: formTitle.trim(),
      version: formVersion.trim() || 'v1.0',
      specificAudience: formAudience.trim() || 'Ideal High-Ticket Buyers',
      triggeringProblem: formProblem.trim() || 'Stuck in manual client acquisition',
      promiseOneSentence: formPromise.trim() || 'Achieve a clear diagnostic win in under 10 minutes.',
      beliefItShifts:
        formBelief.trim() ||
        student.worksheetAnswers.m02_q4_belief ||
        'Shifts core belief toward our mechanism',
      completionTime: formCompletionTime.trim() || 'Under 10 minutes',
      deliveryFormat: formFormat,
      keywordTrigger: cleanKeyword || 'SHIFT',
      trackingLink: formLink.trim() || 'https://marketconcussion.com/magnet',
      dmHandoffScript:
        formScript.trim() ||
        `Hey [First Name]! Saw you commented ${cleanKeyword || 'SHIFT'} — here is direct access to ${formTitle.trim()}: ${
          formLink.trim() || '[Link]'
        }`,
      publicCommentReply:
        formPublicReply.trim() ||
        `Just sent ${formTitle.trim()} straight to your DMs! Check your message requests.`,
      dmDiagnosticQuestion: formDiagnostic.trim(),
      dmBridgeScript: formBridgeScript.trim(),
      sectionsSteps: formSections.trim(),
      bridgeToOffer: formBridge.trim(),
      hostedWhere: formHostedWhere.trim(),
      status: formStatus
    };

    if (editingMagnetId) {
      onUpdateShiftMagnet(editingMagnetId, payload);
    } else {
      onAddShiftMagnet({
        id: `mag-${Date.now()}`,
        ...payload
      });
    }

    setShowEditorModal(false);
    setEditingMagnetId(null);
  };

  const handleDuplicateMagnet = (mag: ShiftMagnet) => {
    const clone: ShiftMagnet = {
      ...mag,
      id: `mag-${Date.now()}`,
      workingTitle: `${mag.workingTitle} (Copy)`,
      keywordTrigger: `${mag.keywordTrigger}2`,
      status: 'Draft'
    };
    onAddShiftMagnet(clone);
  };

  const handleAddDmConvoRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConvoProspect.trim()) return;
    const record: DmConversationRecord = {
      id: `dm-log-${Date.now()}`,
      prospectName: newConvoProspect.trim(),
      platform: newConvoPlatform,
      magnetKeyword: newConvoKeyword,
      stage: newConvoStage,
      constraintPicked: newConvoConstraint.trim(),
      notes: newConvoNotes.trim(),
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
    saveDmConvoRecords([record, ...dmConvoRecords]);
    setNewConvoProspect('');
    setNewConvoNotes('');
  };

  const liveMagnetsCount = student.shiftMagnets.filter(m => m.status === 'Live').length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Command Header & KPI Strip */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#09ADEF]/12 border border-[#09ADEF]/30 text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
              <Magnet className="w-3.5 h-3.5" />
              <span>PHASE 04 & 05 · SHIFT MAGNETS, S.H.I.F.T. DM PLAYBOOK & RE-ENGAGEMENT LOOPS</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl text-white tracking-wide uppercase mt-2">
              CONVERSION & DM ENGINE
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-2xl leading-relaxed">
              Every video you publish carries two CTAs: a low-friction <strong>Shift Magnet keyword</strong> and your <strong>VSL / 2-Page Offer Doc</strong>. Both land in the DMs — where a structured 5-step S.H.I.F.T. conversation and 4-level Re-Engagement Loop turn viewers into clients without high-pressure sales calls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onSyncFromLesson21 && (
              <button
                type="button"
                onClick={onSyncFromLesson21}
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/12 text-xs font-semibold text-neutral-200 inline-flex items-center gap-1.5 cursor-pointer transition"
                title="Pull your Module 16 Shift Magnet answers from Lesson 21 into this repository"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#09ADEF]" />
                <span>Sync Lesson 21 Magnet</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCreateModal}
              className="btn-2mm px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Shift Magnet</span>
            </button>
          </div>
        </div>

        {/* 4-Metric Conversion Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-white/[0.07]">
          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
              LIVE SHIFT MAGNETS
            </div>
            <div className="font-display text-xl sm:text-2xl text-white mt-0.5">
              {liveMagnetsCount} OF {student.shiftMagnets.length} LIVE
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400">
              STUDIO VIDEOS WIRED
            </div>
            <div className="font-display text-xl sm:text-2xl text-white mt-0.5">
              {student.supportingVideos.filter(v => Boolean(v.attachedMagnetId)).length} /{' '}
              {student.supportingVideos.length} CTAS
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              DM RESPONSE SLA
            </div>
            <div className="font-display text-xl sm:text-2xl text-white mt-0.5 truncate">
              {student.worksheetAnswers['m17_owner_sla'] ? 'CONFIGURED ✓' : '< 2 HR SLA'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
              TRACKED DM THREADS
            </div>
            <div className="font-display text-xl sm:text-2xl text-white mt-0.5">
              {dmConvoRecords.length} LOGGED
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#07090D] border border-white/[0.08] w-full sm:w-auto">
          {[
            {
              id: 'MAGNETS' as const,
              label: `1. Shift Magnets (${student.shiftMagnets.length})`,
              shortLabel: `Magnets (${student.shiftMagnets.length})`,
              icon: Magnet
            },
            {
              id: 'DM_MATRIX' as const,
              label: '2. S.H.I.F.T. DM Playbook & Tracker',
              shortLabel: 'DM Playbook',
              icon: MessageSquare
            },
            {
              id: 'REENGAGE' as const,
              label: '3. Re-Engagement Loops (Day 2–30)',
              shortLabel: 'Re-Engage Loops',
              icon: Repeat
            }
          ].map(t => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#09ADEF] text-white shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">{t.shortLabel}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {onOpenLesson && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenLesson(21)}
              className="px-3 py-2 rounded-xl bg-[#07090D] hover:bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-neutral-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#09ADEF]" />
              <span>Open Lesson 21 (Module 16 & 17)</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenLesson(24)}
              className="px-3 py-2 rounded-xl bg-[#07090D] hover:bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-neutral-300 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#09ADEF]" />
              <span>Lesson 24 (2-Page Offer Doc)</span>
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          TAB 1: SHIFT MAGNETS REPOSITORY (ADD, EDIT, DUPLICATE, DELETE, ASSIGN)
         ===================================================================== */}
      {subTab === 'MAGNETS' && (
        <div className="space-y-5">
          {/* Shift Magnet Architecture Guide Banner */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[#09ADEF]/25 bg-[#050911]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#09ADEF]" />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-white">
                  THE 3 LAWS OF A HIGH-CONVERTING SHIFT MAGNET (MODULE 16)
                </span>
              </div>
              <span className="text-[11px] text-[#09ADEF] font-medium">
                “One magnet answered fast beats three ignored.”
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.07]">
                <div className="font-bold text-[#09ADEF] uppercase tracking-wider text-[10px] mb-1">
                  1. SHIFTS A BELIEF (NOT JUST A FREEBIE)
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  A traditional lead magnet gives away free homework. A <strong>Shift Magnet</strong> dismantles an old false belief and proves why your mechanism is required.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.07]">
                <div className="font-bold text-[#09ADEF] uppercase tracking-wider text-[10px] mb-1">
                  2. UNDER 10 MINUTES TO CONSUME
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  Nobody reads a 45-page eBook. Build a <strong>1-Page Scorecard, Checklist, $5 Wiring Map, or Custom GPT</strong> that delivers an ”aha” win in the first 2–5 minutes.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.07]">
                <div className="font-bold text-[#09ADEF] uppercase tracking-wider text-[10px] mb-1">
                  3. COMMENT KEYWORD → DM HANDOFF
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  In Take 5 of your daily video, tell viewers: <em>“Comment [KEYWORD] and I’ll DM you the [Magnet].”</em> Delivering it in DMs opens a 1-on-1 thread automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Shift Magnet Cards Grid */}
          {student.shiftMagnets.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#09ADEF]/15 border border-[#09ADEF]/30 text-[#09ADEF] flex items-center justify-center mx-auto">
                <Magnet className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-2xl text-white uppercase">No Shift Magnets Created Yet</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Create your first Shift Magnet from our 1-click proven blueprints so you can attach a Comment Keyword CTA to your Daily Concussion Content videos.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="btn-2mm px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Shift Magnet</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              {student.shiftMagnets.map(mag => {
                const attachedCount = videoUsageByMagnetId[mag.id] || 0;
                const isConfirmingDelete = confirmDeleteId === mag.id;
                const isExpanded = expandedMagnetId === mag.id;

                return (
                  <div
                    key={mag.id}
                    className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5 border border-white/[0.08] hover:border-[#09ADEF]/40 transition-all"
                  >
                    <div className="space-y-4">
                      {/* Top Keyword, Status, and Edit/Delete Bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#09ADEF]/15 border border-[#09ADEF]/35 text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                            KEYWORD: “{mag.keywordTrigger}” · {mag.deliveryFormat}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 pl-0.5">
                            <span>{mag.version || 'v1.0'}</span>
                            <span>·</span>
                            <span>{mag.completionTime}</span>
                            <span>·</span>
                            <span className="text-emerald-400 font-semibold">
                              Used in {attachedCount} Studio {attachedCount === 1 ? 'Video' : 'Videos'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateShiftMagnet(mag.id, {
                                status: mag.status === 'Live' ? 'Draft' : 'Live'
                              })
                            }
                            className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider cursor-pointer border ${
                              mag.status === 'Live'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                            }`}
                            title="Click to toggle Live / Draft status"
                          >
                            {mag.status}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(mag)}
                            className="p-1.5 rounded-lg bg-[#040507] hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white cursor-pointer"
                            title="Edit Shift Magnet & DM Scripts"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateMagnet(mag)}
                            className="p-1.5 rounded-lg bg-[#040507] hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white cursor-pointer"
                            title="Duplicate Shift Magnet"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {onDeleteShiftMagnet && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isConfirmingDelete) {
                                  onDeleteShiftMagnet(mag.id);
                                  setConfirmDeleteId(null);
                                } else {
                                  setConfirmDeleteId(mag.id);
                                }
                              }}
                              className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold uppercase cursor-pointer transition flex items-center gap-1 ${
                                isConfirmingDelete
                                  ? 'bg-rose-500 text-white border-rose-400'
                                  : 'bg-[#040507] hover:bg-rose-500/20 border-white/10 hover:border-rose-500/40 text-neutral-400 hover:text-rose-300'
                              }`}
                              title="Delete Shift Magnet"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {isConfirmingDelete && <span>Confirm?</span>}
                            </button>
                          )}
                        </div>
                      </div>

                      {isConfirmingDelete && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-[11px] text-rose-200">
                          <span>Delete “{mag.workingTitle}”?</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="underline text-neutral-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteShiftMagnet?.(mag.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold cursor-pointer"
                            >
                              Yes, Delete
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Title & Specific Audience */}
                      <div>
                        <h3 className="font-display text-2xl text-white tracking-wide leading-tight">
                          {mag.workingTitle}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">
                          <strong className="text-neutral-300">For:</strong> {mag.specificAudience}
                        </p>
                      </div>

                      {/* Triggering Problem */}
                      {mag.triggeringProblem && (
                        <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06] text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400 block mb-0.5">
                            TRIGGERING PROBLEM (WHY THEY COMMENT):
                          </span>
                          <p className="text-neutral-300 leading-relaxed">{mag.triggeringProblem}</p>
                        </div>
                      )}

                      {/* Signature Vertical Left-Border THE SHIFT Callout */}
                      <div className="border-l-2 border-[#09ADEF] pl-3.5 py-0.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF] block">
                          THE BELIEF IT SHIFTS:
                        </span>
                        <p className="text-xs text-white leading-relaxed">{mag.beliefItShifts}</p>
                      </div>

                      {/* Immediate Win */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400 block mb-1">
                          ONE-SENTENCE PROMISE ({mag.completionTime} WIN):
                        </span>
                        <p className="text-xs text-white font-semibold leading-relaxed">
                          {mag.promiseOneSentence}
                        </p>
                      </div>

                      {/* Optional Sections & Bridge Details */}
                      {(mag.sectionsSteps || mag.bridgeToOffer || mag.hostedWhere) && (
                        <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
                          {mag.sectionsSteps && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Inside the Asset:{' '}
                              </span>
                              <span className="text-neutral-300">{mag.sectionsSteps}</span>
                            </div>
                          )}
                          {mag.hostedWhere && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                Delivery Wiring:{' '}
                              </span>
                              <span className="text-neutral-300">{mag.hostedWhere}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom DM Script Pack & Studio Assignment */}
                    <div className="pt-4 border-t border-white/[0.07] space-y-3">
                      {/* Step 1: DM Handoff Opener */}
                      <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                            1. DM Handoff Opener (Stage S)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(mag.id, mag.dmHandoffScript)}
                            className="text-[#09ADEF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === mag.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy Opener
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-neutral-200 leading-relaxed">“{mag.dmHandoffScript}”</p>
                      </div>

                      {/* Expandable Full Comment-to-DM Flow for this Magnet */}
                      <button
                        type="button"
                        onClick={() => setExpandedMagnetId(isExpanded ? null : mag.id)}
                        className="w-full py-2 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] text-[11px] font-semibold text-neutral-300 flex items-center justify-between cursor-pointer"
                      >
                        <span>
                          {isExpanded
                            ? 'Hide Public Reply, A/B/C Diagnostic & Offer Bridge ↑'
                            : 'View Full Comment-to-DM Script Sequence (3 Steps) ↓'}
                        </span>
                        <MessageSquare className="w-3.5 h-3.5 text-[#09ADEF]" />
                      </button>

                      {isExpanded && (
                        <div className="space-y-2.5 pt-1">
                          {mag.publicCommentReply && (
                            <div className="p-3 rounded-xl bg-black border border-white/10 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                  Public Comment Reply (Before DM)
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(`${mag.id}-pub`, mag.publicCommentReply!)
                                  }
                                  className="text-[11px] text-[#09ADEF] hover:underline cursor-pointer"
                                >
                                  {copiedId === `${mag.id}-pub` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <p className="text-neutral-300">“{mag.publicCommentReply}”</p>
                            </div>
                          )}

                          {mag.dmDiagnosticQuestion && (
                            <div className="p-3 rounded-xl bg-black border border-white/10 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                  2. Stage H · A/B/C Diagnostic Question
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(`${mag.id}-diag`, mag.dmDiagnosticQuestion!)
                                  }
                                  className="text-[11px] text-[#09ADEF] hover:underline cursor-pointer"
                                >
                                  {copiedId === `${mag.id}-diag` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <p className="text-neutral-300">“{mag.dmDiagnosticQuestion}”</p>
                            </div>
                          )}

                          {mag.dmBridgeScript && (
                            <div className="p-3 rounded-xl bg-black border border-white/10 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                                  3. Stage I/F/T · Bridge to 2-Page Offer Doc
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(`${mag.id}-bridge`, mag.dmBridgeScript!)
                                  }
                                  className="text-[11px] text-[#09ADEF] hover:underline cursor-pointer"
                                >
                                  {copiedId === `${mag.id}-bridge` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <p className="text-neutral-300">“{mag.dmBridgeScript}”</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Link & Default Studio Assignment Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <a
                            href={mag.trackingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neutral-400 hover:text-[#09ADEF] truncate max-w-[165px] inline-flex items-center gap-1"
                          >
                            <span className="truncate">{mag.trackingLink}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${mag.id}-link`, mag.trackingLink)}
                            className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/10 text-[10px] text-neutral-200 cursor-pointer"
                          >
                            {copiedId === `${mag.id}-link` ? 'Copied!' : 'Copy URL'}
                          </button>
                        </div>

                        {onAssignToPendingVideos && (
                          <button
                            type="button"
                            onClick={() => onAssignToPendingVideos(mag.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#09ADEF]/15 hover:bg-[#09ADEF]/25 border border-[#09ADEF]/35 text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] cursor-pointer"
                            title="Set this Shift Magnet as the active CTA on all upcoming Studio videos"
                          >
                            Set as Default Studio CTA
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: S.H.I.F.T. DM PLAYBOOK, WIRING GUIDE & CONVERSATION TRACKER
         ===================================================================== */}
      {subTab === 'DM_MATRIX' && (
        <div className="space-y-6">
          {/* Section A: Comment-to-DM Wiring & SLA Architecture */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                  MODULE 17 · CONVERSATIONAL CONVERSION ARCHITECTURE
                </span>
                <h2 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wide mt-1">
                  How Comment-to-DM Handoffs & The 5-Step S.H.I.F.T. DM Matrix Work
                </h2>
                <p className="text-xs text-neutral-300 mt-1 max-w-3xl leading-relaxed">
                  Never send paid or organic viewers to a cold calendar page. Whether a viewer comments your <strong>Shift Magnet Keyword</strong> (CTA #1) or clicks your <strong>VSL / Offer Doc</strong> (CTA #2), your goal is to open a 5-stage DM conversation that diagnoses their constraint before inviting them to read your 2-Page Offer Doc.
                </p>
              </div>

              {/* Editable DM Owner & Response SLA Box (Synced with Lesson 21 m17_owner_sla) */}
              <div className="w-full lg:w-80 p-3.5 rounded-xl bg-[#040507] border border-[#09ADEF]/35 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    DM OWNER & RESPONSE SLA
                  </span>
                  <span className="text-[9px] text-emerald-400 font-semibold">Synced w/ L21</span>
                </div>
                <input
                  type="text"
                  value={student.worksheetAnswers['m17_owner_sla'] || ''}
                  onChange={e => onUpdateField?.('m17_owner_sla', e.target.value)}
                  placeholder="e.g. Josh · <2 hr SLA (9pm DM answered by 8am)"
                  className="w-full rounded-lg bg-black border border-white/12 px-2.5 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
                />
                <p className="text-[10px] text-neutral-400">
                  Rule: A DM arriving at 9:00 PM must get a real human response by 8:00 AM the next morning.
                </p>
              </div>
            </div>

            {/* 4-Step Comment-to-DM Technical Wiring Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                  STEP 1 · VIDEO TAKE 5 CTA
                </div>
                <div className="font-semibold text-white">Viewer Comments Keyword</div>
                <p className="text-neutral-400 leading-relaxed">
                  In Take 5 of your daily video, call out a single word (e.g., <strong>“Comment AUDIT”</strong>). Avoid multi-word phrases so mobile viewers don’t typo the trigger.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                  STEP 2 · PUBLIC REPLY + INSTANT DM
                </div>
                <div className="font-semibold text-white">Deliver Link in 15 Seconds</div>
                <p className="text-neutral-400 leading-relaxed">
                  Your automation (ManyChat / HighLevel) or operator replies publicly to the comment (<em>“Sent to your DMs!”</em>) and immediately DMs the promised link (<strong>Stage S</strong>).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                  STEP 3 · 60-SECOND DELAY DIAGNOSTIC
                </div>
                <div className="font-semibold text-white">Ask the A / B / C Question</div>
                <p className="text-neutral-400 leading-relaxed">
                  60 seconds after sending the link, send your <strong>Stage H (A / B / C Constraint Question)</strong> so the prospect only has to type a single letter to reply.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  STEP 4 · HUMAN TAKEOVER (I → F → T)
                </div>
                <div className="font-semibold text-white">Illuminate & Send Offer Doc</div>
                <p className="text-neutral-400 leading-relaxed">
                  As soon as they reply A, B, or C, turn off automation. A human illuminates the root cause (<strong>Stage I & F</strong>) and asks permission to send the <strong>2-Page Offer Doc (Stage T)</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Section B: Interactive Live Script Personalizer */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-[#09ADEF]/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                  LIVE CONVERSATION PERSONALIZER
                </div>
                <h3 className="font-display text-xl sm:text-2xl text-white uppercase mt-0.5">
                  Auto-Fill All 5 S.H.I.F.T. DM Scripts for Any Prospect
                </h3>
              </div>
              <span className="text-[11px] text-neutral-400">
                Type a prospect’s name below — every script card updates automatically for 1-click copy.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  PROSPECT FIRST NAME
                </label>
                <input
                  type="text"
                  value={simProspectName}
                  onChange={e => setSimProspectName(e.target.value)}
                  placeholder="e.g. Marcus"
                  className="w-full rounded-xl bg-[#040507] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  SHIFT MAGNET REQUESTED
                </label>
                <select
                  value={selectedSimMagnet?.id || ''}
                  onChange={e => setSimMagnetId(e.target.value)}
                  className="w-full rounded-xl bg-[#040507] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                >
                  {student.shiftMagnets.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.keywordTrigger}] {m.workingTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  SPECIFIC PROBLEM / GOAL
                </label>
                <input
                  type="text"
                  value={simProblem}
                  onChange={e => setSimProblem(e.target.value)}
                  placeholder="e.g. predictable high-ticket DMs without sales calls"
                  className="w-full rounded-xl bg-[#040507] border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                />
              </div>
            </div>
          </div>

          {/* Section C: The 5-Stage S.H.I.F.T. DM Matrix Cards (Instruction + Editable Scripts) */}
          <div className="space-y-4">
            {DM_MATRIX_DETAILED.map(stage => {
              const savedCustomScript = student.worksheetAnswers[stage.workbookFieldId] || '';
              const activeScriptToCopy = personalizeText(
                savedCustomScript.trim() ? savedCustomScript : stage.defaultScript
              );

              return (
                <div
                  key={stage.letter}
                  className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 border border-white/[0.08]"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.07] pb-3.5">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#09ADEF]/15 border border-[#09ADEF]/40 text-[#09ADEF] font-display text-2xl flex items-center justify-center shrink-0">
                        {stage.letter}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl sm:text-2xl text-white uppercase tracking-wide">
                            {stage.letter} · {stage.stage}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Goal: {stage.result}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 mt-0.5">{stage.function}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-[#09ADEF]" />
                      <span>{stage.timing}</span>
                    </div>
                  </div>

                  {/* 3-Column Instruction Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] block mb-1">
                        SUBCONSCIOUS PROSPECT QUESTION
                      </span>
                      <p className="text-white italic">{stage.prospectQuestion}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#040507] border border-white/[0.06]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                        REQUIRED CONVERSATIONAL ASSET
                      </span>
                      <p className="text-neutral-200">{stage.asset}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/25">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3" /> WHAT BREAKS THIS STAGE
                      </span>
                      <p className="text-rose-100/90">{stage.whatBreaksIt}</p>
                    </div>
                  </div>

                  {/* Personalized Ready-to-Copy Script + Custom Override Editor */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                    <div className="p-4 rounded-xl bg-[#040507] border border-[#09ADEF]/30 flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                          READY-TO-SEND SCRIPT (PERSONALIZED FOR {simProspectName.toUpperCase() || 'PROSPECT'})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`dm-stage-${stage.letter}`, activeScriptToCopy)}
                          className="btn-2mm px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === `dm-stage-${stage.letter}` ? (
                            <>
                              <Check className="w-3 h-3" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy DM Script
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-white whitespace-pre-line leading-relaxed">
                        “{activeScriptToCopy}”
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.07] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                          CUSTOMIZE YOUR {stage.letter}-STAGE TEMPLATE (SYNCED TO WORKBOOK L21)
                        </span>
                        {savedCustomScript && (
                          <button
                            type="button"
                            onClick={() => onUpdateField?.(stage.workbookFieldId, '')}
                            className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                          >
                            Reset to Default
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={savedCustomScript}
                        onChange={e => onUpdateField?.(stage.workbookFieldId, e.target.value)}
                        placeholder={stage.defaultScript}
                        className="w-full rounded-lg bg-black border border-white/12 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section D: Active DM Conversation Tracker (Module 17 Page 64) */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                  MODULE 17 (PAGE 64) · PER-CONVERSATION RECORD
                </span>
                <h3 className="font-display text-2xl text-white uppercase mt-0.5">
                  Active DM Pipeline & Re-Engagement Tracker
                </h3>
                <p className="text-xs text-neutral-400">
                  Log inbound DM threads here so no prospect slips through the cracks between Stage S and Day 30 Re-Engagement.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleAddDmConvoRecord}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 p-3.5 rounded-xl bg-[#040507] border border-white/10 text-xs"
            >
              <input
                type="text"
                required
                value={newConvoProspect}
                onChange={e => setNewConvoProspect(e.target.value)}
                placeholder="Prospect Name / @handle *"
                className="rounded-lg bg-black border border-white/12 px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
              />

              <select
                value={newConvoPlatform}
                onChange={e =>
                  setNewConvoPlatform(e.target.value as DmConversationRecord['platform'])
                }
                className="rounded-lg bg-black border border-white/12 px-3 py-2 text-white focus:outline-none focus:border-[#09ADEF]"
              >
                <option value="Instagram">Instagram DM</option>
                <option value="LinkedIn">LinkedIn DM</option>
                <option value="Facebook">Facebook Messenger</option>
                <option value="YouTube">YouTube / Email</option>
                <option value="SMS">SMS / Text</option>
              </select>

              <input
                type="text"
                value={newConvoKeyword}
                onChange={e => setNewConvoKeyword(e.target.value)}
                placeholder="Trigger (e.g. AUDIT / Video #4)"
                className="rounded-lg bg-black border border-white/12 px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
              />

              <select
                value={newConvoStage}
                onChange={e => setNewConvoStage(e.target.value as DmConversationRecord['stage'])}
                className="rounded-lg bg-black border border-white/12 px-3 py-2 text-white focus:outline-none focus:border-[#09ADEF]"
              >
                <option value="S · Signal Sent">S · Signal Sent</option>
                <option value="H · A/B/C Diagnosed">H · A/B/C Diagnosed</option>
                <option value="I · Issue Illuminated">I · Issue Illuminated</option>
                <option value="F · Magnet Delivered">F · Magnet Delivered</option>
                <option value="T · Offer Doc Sent">T · Offer Doc Sent</option>
                <option value="Loop · Day 2 Nudge">Loop · Day 2 Nudge</option>
                <option value="Loop · Day 5 Nudge">Loop · Day 5 Nudge</option>
                <option value="Loop · Day 12 Nudge">Loop · Day 12 Nudge</option>
                <option value="Loop · Day 30 Close">Loop · Day 30 Close</option>
                <option value="Closed / Won">★ Closed / Won</option>
              </select>

              <input
                type="text"
                value={newConvoConstraint}
                onChange={e => setNewConvoConstraint(e.target.value)}
                placeholder="Constraint / Objection..."
                className="rounded-lg bg-black border border-white/12 px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#09ADEF]"
              />

              <button
                type="submit"
                className="btn-2mm rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log DM Thread</span>
              </button>
            </form>

            {dmConvoRecords.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#040507] border border-white/[0.06] text-center text-xs text-neutral-400">
                No active DM threads logged yet. Add your first inbound prospect above to track them through the S.H.I.F.T. stages and Re-Engagement Loops.
              </div>
            ) : (
              <div className="space-y-2">
                {dmConvoRecords.map(rec => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-bold text-white text-sm">{rec.prospectName}</span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-neutral-300 text-[10px]">
                        {rec.platform}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#09ADEF]/15 text-[#09ADEF] font-bold text-[10px]">
                        Trigger: {rec.magnetKeyword}
                      </span>
                      {rec.constraintPicked && (
                        <span className="text-neutral-400">
                          Constraint: <strong className="text-neutral-200">{rec.constraintPicked}</strong>
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-500">Logged {rec.updatedAt}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={rec.stage}
                        onChange={e => {
                          const updated = dmConvoRecords.map(item =>
                            item.id === rec.id
                              ? {
                                  ...item,
                                  stage: e.target.value as DmConversationRecord['stage']
                                }
                              : item
                          );
                          saveDmConvoRecords(updated);
                        }}
                        className="rounded-lg bg-black border border-[#09ADEF]/40 px-2.5 py-1.5 text-[11px] font-semibold text-[#09ADEF] focus:outline-none"
                      >
                        <option value="S · Signal Sent">S · Signal Sent</option>
                        <option value="H · A/B/C Diagnosed">H · A/B/C Diagnosed</option>
                        <option value="I · Issue Illuminated">I · Issue Illuminated</option>
                        <option value="F · Magnet Delivered">F · Magnet Delivered</option>
                        <option value="T · Offer Doc Sent">T · Offer Doc Sent</option>
                        <option value="Loop · Day 2 Nudge">Loop · Day 2 Nudge</option>
                        <option value="Loop · Day 5 Nudge">Loop · Day 5 Nudge</option>
                        <option value="Loop · Day 12 Nudge">Loop · Day 12 Nudge</option>
                        <option value="Loop · Day 30 Close">Loop · Day 30 Close</option>
                        <option value="Closed / Won">★ Closed / Won</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          saveDmConvoRecords(dmConvoRecords.filter(item => item.id !== rec.id))
                        }
                        className="p-1.5 rounded-lg bg-black hover:bg-rose-500/20 border border-white/10 text-neutral-400 hover:text-rose-300 cursor-pointer"
                        title="Remove thread record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: 4-LEVEL RE-ENGAGEMENT LOOPS & FULL LIST BOOMERANG PLAYBOOK
         ===================================================================== */}
      {subTab === 'REENGAGE' && (
        <div className="space-y-6">
          {/* Top Instructional Doctrine on Handling Silence */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 border border-[#09ADEF]/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                  FIG. 15 · HANDLING SILENCE & RE-ENGAGEMENT LOOPS
                </span>
                <h2 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wide mt-1">
                  The 4-Level Re-Engagement Ladder (Day 2 · Day 5 · Day 12 · Day 30)
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-3xl leading-relaxed">
                  When a prospect goes silent in DMs, 90% of the time it is <strong>not rejection</strong> — they opened your Shift Magnet between meetings and got pulled away. Never send <em>“just following up”</em> twice. Each level below anchors to their <strong>unresolved decision</strong> rather than your impatience.
                </p>
              </div>
            </div>

            {/* The 3 Re-Engagement Loop Entry Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                  LOOP ENTRY 1 · UNOPENED SHIFT MAGNET
                </div>
                <div className="font-semibold text-white">Commented Keyword → Ghosted at Stage S/H</div>
                <p className="text-neutral-400 leading-relaxed">
                  Use <strong>Day 2 (Context Nudge)</strong> to make sure the link worked, then <strong>Day 5 (Friction Nudge)</strong> to ask if a specific section fit their model.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  LOOP ENTRY 2 · STALLED DIAGNOSTIC
                </div>
                <div className="font-semibold text-white">Answered A / B / C → Ghosted Before Offer Doc</div>
                <p className="text-neutral-400 leading-relaxed">
                  Use <strong>Day 5 (Value Micro-Drop)</strong> to send a 60-second video clip answering their A/B/C bottleneck, then <strong>Day 12 (Priority Check)</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  LOOP ENTRY 3 · SILENT AFTER 2-PAGE OFFER DOC
                </div>
                <div className="font-semibold text-white">Requested Offer Doc → Evaluating in Silence</div>
                <p className="text-neutral-400 leading-relaxed">
                  Walk through all 4 levels (<strong>Day 2 → Day 5 → Day 12 → Day 30 Permission to Close</strong>). Day 30 regularly revives 25%+ of high-ticket threads.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Personalizer Bar for Re-Engagement Scripts */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 bg-[#050911] border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  PROSPECT FIRST NAME
                </label>
                <input
                  type="text"
                  value={simProspectName}
                  onChange={e => setSimProspectName(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  SHIFT MAGNET SENT
                </label>
                <select
                  value={selectedSimMagnet?.id || ''}
                  onChange={e => setSimMagnetId(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                >
                  {student.shiftMagnets.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.keywordTrigger}] {m.workingTitle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  THEIR SPECIFIC BOTTLENECK
                </label>
                <input
                  type="text"
                  value={simProblem}
                  onChange={e => setSimProblem(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-[#09ADEF]"
                />
              </div>
            </div>
          </div>

          {/* 4-Level Detailed Re-Engagement Cards */}
          <div className="space-y-4">
            {REENGAGEMENT_LOOPS_DETAILED.map((loop, idx) => {
              const savedCustom = student.worksheetAnswers[loop.workbookFieldId] || '';
              const primaryScript = personalizeText(
                savedCustom.trim() ? savedCustom : loop.defaultScript
              );

              return (
                <div
                  key={loop.id}
                  className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 border border-white/[0.08]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#09ADEF]/15 border border-[#09ADEF]/40 text-[#09ADEF] font-display text-xl flex items-center justify-center shrink-0">
                        0{idx + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl sm:text-2xl text-white uppercase tracking-wide">
                            {loop.level} — {loop.type}
                          </h3>
                          <span className="badge-2mm px-2.5 py-0.5 rounded-full text-[9px]">
                            {loop.badge}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          <strong className="text-neutral-200">When to send:</strong> {loop.triggerCondition}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Psychology + Mistake to Avoid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF] block mb-1">
                        WHY THIS WORKS (BUYER PSYCHOLOGY)
                      </span>
                      <p className="text-neutral-200 leading-relaxed">{loop.psychology}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/25">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block mb-1">
                        WHAT NEVER TO DO AT {loop.level.split('·')[1]?.trim() || 'THIS STAGE'}
                      </span>
                      <p className="text-rose-100/90 leading-relaxed">{loop.avoidMistake}</p>
                    </div>
                  </div>

                  {/* Primary Personalized Script + Custom Workbook Sync Box */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#040507] border border-[#09ADEF]/35 flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                          PRIMARY SCRIPT (READY TO COPY)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`reengage-main-${loop.id}`, primaryScript)}
                          className="btn-2mm px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === `reengage-main-${loop.id}` ? (
                            <>
                              <Check className="w-3 h-3" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Message
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-white font-medium leading-relaxed">
                        “{primaryScript}”
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#040507] border border-white/[0.07] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          YOUR CUSTOM {loop.level.toUpperCase()} SCRIPT (SYNCED W/ L21)
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={savedCustom}
                        onChange={e => onUpdateField?.(loop.workbookFieldId, e.target.value)}
                        placeholder={loop.defaultScript}
                        className="w-full rounded-lg bg-black border border-white/12 p-2.5 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#09ADEF]"
                      />
                    </div>
                  </div>

                  {/* 3 Situational Script Variations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    {loop.scenarioScripts.map((sc, sIdx) => {
                      const personalizedVariant = personalizeText(sc.text);
                      const copyKey = `reengage-${loop.id}-var-${sIdx}`;
                      return (
                        <div
                          key={sIdx}
                          className="p-3 rounded-xl bg-black/70 border border-white/[0.07] flex flex-col justify-between space-y-2 text-xs"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                              {sc.scenario}
                            </span>
                            <p className="text-neutral-200 leading-relaxed">
                              “{personalizedVariant}”
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleCopy(copyKey, personalizedVariant)}
                              className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/10 text-[10px] font-semibold text-[#09ADEF] cursor-pointer"
                            >
                              {copiedId === copyKey ? '✓ Copied' : 'Copy Variant'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Loop: The $5/Day Full List Boomerang (What Happens After Day 30) */}
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-emerald-500/30 bg-emerald-500/[0.04] space-y-4">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-[0.16em]">
              <Layers className="w-4 h-4" />
              <span>AFTER DAY 30 · THE “FULL LIST BOOMERANG” RE-ENGAGEMENT LOOP</span>
            </div>
            <h3 className="font-display text-2xl text-white uppercase tracking-wide">
              Why Closed Loops Never Die in the 2mmShift System
            </h3>
            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
              In traditional cold outbound, a prospect who goes silent at Day 30 is dead forever. In <strong>Market Concussion</strong>, closing the DM loop politely at Day 30 hands the prospect back to your automated content ecosystem so they re-engage on their own timing:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="font-bold text-emerald-300 uppercase text-[10px] tracking-wider">
                  1. THE $5/DAY 25% AD SEQUENCE (LESSON 20)
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  Because they engaged or watched 25%+ of a video, they sit inside your <strong>Master Full List</strong> custom audience and automatically see your next sequenced Core & Teaching Videos for pennies.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="font-bold text-emerald-300 uppercase text-[10px] tracking-wider">
                  2. FRIDAY “PATH” SHORT-FORM VIDEOS (LESSON 19)
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  Every Friday in your ShiftCycle is a <strong>Path (Momentum)</strong> video featuring a fresh angle or new Shift Magnet test — giving silent followers a brand-new keyword reason to raise their hand again.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="font-bold text-emerald-300 uppercase text-[10px] tracking-wider">
                  3. THE MONTHLY CONVERSION WORKSHOP (LESSON 23)
                </div>
                <p className="text-neutral-300 leading-relaxed">
                  Once a month, invite your entire Full List and past DM threads to your live 60-minute Workshop. Silent DM leads regularly attend live, build the worksheet in the room, and request the Offer Doc that same afternoon.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE OR EDIT SHIFT MAGNET (WITH 1-CLICK BLUEPRINT PRESETS)
         ===================================================================== */}
      <ModalDialog
        isOpen={showEditorModal}
        onClose={() => {
          setShowEditorModal(false);
          setEditingMagnetId(null);
        }}
        title={editingMagnetId ? 'Edit Shift Magnet & DM Sequence' : 'Create New Shift Magnet'}
        subtitle="Module 16 · Shift Magnet & Comment-to-DM Builder"
      >
        <form onSubmit={handleSaveMagnetForm} className="space-y-4 text-xs">
          {/* 1-Click Proven Blueprint Presets */}
          {!editingMagnetId && (
            <div className="p-3 rounded-xl bg-[#05080F] border border-[#09ADEF]/30 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                ⚡ 1-CLICK PROVEN BLUEPRINTS (OPTIONAL — CLICK TO AUTO-FILL)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {MAGNET_BLUEPRINT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPresetBlueprint(preset)}
                    className="p-2 rounded-lg bg-black hover:bg-[#09ADEF]/15 border border-white/10 hover:border-[#09ADEF]/40 text-left transition cursor-pointer"
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#09ADEF]">
                      {preset.badge} · KEYWORD “{preset.keywordTrigger}”
                    </div>
                    <div className="text-xs font-semibold text-white truncate">
                      {preset.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-neutral-300 mb-1">
                Working Title *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. The 7-Hour Pipeline Equity Audit"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Comment Keyword *
              </label>
              <input
                type="text"
                required
                value={formKeyword}
                onChange={e => setFormKeyword(e.target.value)}
                placeholder="e.g. AUDIT"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white uppercase font-bold focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as 'Live' | 'Draft')}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              >
                <option value="Live">Live</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Delivery Format
              </label>
              <select
                value={formFormat}
                onChange={e =>
                  setFormFormat(e.target.value as ShiftMagnet['deliveryFormat'])
                }
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              >
                <option value="Checklist">1-Page Checklist / Scorecard</option>
                <option value="PDF">PDF Guide / Blueprint</option>
                <option value="Audit">Self-Audit Tool</option>
                <option value="Custom GPT">Custom GPT / AI Tool</option>
                <option value="Video">Micro-Video (&lt;10m)</option>
                <option value="Class">Workshop / Class</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Completion Time (&lt;10m Target)
              </label>
              <input
                type="text"
                value={formCompletionTime}
                onChange={e => setFormCompletionTime(e.target.value)}
                placeholder="e.g. 4 minutes"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">Version</label>
              <input
                type="text"
                value={formVersion}
                onChange={e => setFormVersion(e.target.value)}
                placeholder="v1.0"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Specific Audience (Not Everyone)
              </label>
              <input
                type="text"
                value={formAudience}
                onChange={e => setFormAudience(e.target.value)}
                placeholder="Who specifically is this built for?"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Triggering Problem (What They Just Experienced)
              </label>
              <input
                type="text"
                value={formProblem}
                onChange={e => setFormProblem(e.target.value)}
                placeholder="e.g. Posted 5 reels this week with 0 qualified inquiries"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1">
              The Belief It Shifts (Core Mechanism Alignment)
            </label>
            <input
              type="text"
              value={formBelief}
              onChange={e => setFormBelief(e.target.value)}
              placeholder="What old false belief does this dismantle?"
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-300 mb-1">
              One-Sentence Promise (Immediate &lt;10 Minute Win)
            </label>
            <input
              type="text"
              value={formPromise}
              onChange={e => setFormPromise(e.target.value)}
              placeholder="What tangible result do they get in the first 5 minutes?"
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Sections / Steps Inside the Magnet
              </label>
              <input
                type="text"
                value={formSections}
                onChange={e => setFormSections(e.target.value)}
                placeholder="1. Audit · 2. Diagnosis · 3. Next Step"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1">
                Tracking / Hosted URL
              </label>
              <input
                type="text"
                value={formLink}
                onChange={e => setFormLink(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>
          </div>

          {/* Comment-to-DM Script Sequence */}
          <div className="p-3.5 rounded-xl bg-[#05080F] border border-white/10 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
              COMMENT-TO-DM HANDOFF SCRIPTS FOR THIS MAGNET
            </div>

            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                1. Public Comment Reply (Posted under their comment)
              </label>
              <input
                type="text"
                value={formPublicReply}
                onChange={e => setFormPublicReply(e.target.value)}
                placeholder="Just sent it straight to your DMs! Check your message requests."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                2. DM Handoff Opener (Stage S — Signal & Link Delivery)
              </label>
              <textarea
                rows={2}
                value={formScript}
                onChange={e => setFormScript(e.target.value)}
                placeholder="Hey [First Name]! Saw you commented KEYWORD — here is the link..."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                3. Stage H · A / B / C Constraint Diagnostic Question
              </label>
              <textarea
                rows={2}
                value={formDiagnostic}
                onChange={e => setFormDiagnostic(e.target.value)}
                placeholder="Quick question while you open it: are you focused on A) ..., B) ..., or C) ...?"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                4. Stage I/F/T · Bridge to 2-Page Offer Doc / VSL
              </label>
              <textarea
                rows={2}
                value={formBridgeScript}
                onChange={e => setFormBridgeScript(e.target.value)}
                placeholder="Want me to send over our 2-Page Offer Doc showing how we install this in 8 weeks?"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowEditorModal(false);
                setEditingMagnetId(null);
              }}
              className="rounded-xl border border-white/12 px-4 py-2.5 font-medium text-neutral-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-2mm rounded-xl font-bold uppercase tracking-wider px-5 py-2.5 cursor-pointer"
            >
              {editingMagnetId ? 'Save Changes' : 'Create Shift Magnet'}
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
