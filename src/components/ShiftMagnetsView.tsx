import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Check,
  Edit3,
  Trash2,
  ExternalLink,
  ArrowRight
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
  onOpenLiveCrm?: () => void;
}

const QUICK_PRESETS = [
  {
    label: '1-Page Audit Scorecard',
    workingTitle: 'The 7-Hour Pipeline Equity Audit (1-Page Scorecard)',
    keywordTrigger: 'AUDIT',
    deliveryFormat: 'Checklist' as const,
    dmHandoffScript:
      'Hey [First Name]! Saw you commented AUDIT — here is the 1-Page Pipeline Equity Scorecard: [Link]\n\nQuick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?'
  },
  {
    label: '$5/Day Andromeda Guide',
    workingTitle: 'The $5/Day Andromeda Invisible List Wiring Guide',
    keywordTrigger: 'FIVE',
    deliveryFormat: 'PDF' as const,
    dmHandoffScript:
      'Hey [First Name]! Grab the $5/Day Andromeda Wiring Guide right here: [Link]\n\nCurious — are you currently A) Running paid traffic to a VSL/webinar, B) Boosting posts randomly, or C) 100% organic right now?'
  },
  {
    label: '2-Page Offer Doc',
    workingTitle: 'The 2-Page Super Signature Offer Doc Template',
    keywordTrigger: 'DOC',
    deliveryFormat: 'PDF' as const,
    dmHandoffScript:
      'Hey [First Name]! Sending over the 2-Page Offer Doc template now: [Link]\n\nQuick context check: is your core offer A) Under $3k, B) $3k–$15k, or C) $15k+?'
  }
];

export const ShiftMagnetsView: React.FC<ShiftMagnetsViewProps> = ({
  student,
  onAddShiftMagnet,
  onUpdateShiftMagnet,
  onDeleteShiftMagnet,
  onOpenLiveCrm
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingMagnetId, setEditingMagnetId] = useState<string | null>(null);

  // Minimal Form State (Keyword, Title, URL, Auto-DM Script)
  const [keywordTrigger, setKeywordTrigger] = useState('');
  const [workingTitle, setWorkingTitle] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [dmHandoffScript, setDmHandoffScript] = useState('');
  const [showCustomDm, setShowCustomDm] = useState(false);

  const isSafeHttpUrl = (url: string) => /^https?:\/\//i.test(url.trim());

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAddModal = () => {
    setEditingMagnetId(null);
    setKeywordTrigger('');
    setWorkingTitle('');
    setTrackingLink('');
    setDmHandoffScript(
      'Hey [First Name]! Saw you commented [KEYWORD] — here is direct access to [Shift Magnet]: [Link]\n\nQuick question while you open it: are you currently focused on A) Fixing leaky ad funnels, B) Escaping referral-only spiky months, or C) Closing deals in DMs without sales calls?'
    );
    setShowCustomDm(false);
    setShowModal(true);
  };

  const openEditModal = (mag: ShiftMagnet) => {
    setEditingMagnetId(mag.id);
    setKeywordTrigger(mag.keywordTrigger || '');
    setWorkingTitle(mag.workingTitle || '');
    setTrackingLink(mag.trackingLink || '');
    setDmHandoffScript(
      mag.dmHandoffScript ||
        `Hey [First Name]! Saw you commented ${mag.keywordTrigger} — here is direct access to ${mag.workingTitle}: ${mag.trackingLink || '[Link]'}`
    );
    setShowCustomDm(false);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKw = keywordTrigger.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const cleanTitle = workingTitle.trim();
    const rawUrl = trackingLink.trim();
    const cleanUrl = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
    if (!cleanKw || !cleanTitle) return;

    const finalScript =
      dmHandoffScript.trim() ||
      `Hey [First Name]! Saw you commented ${cleanKw} — here is direct access to ${cleanTitle}: ${
        cleanUrl || '[Link]'
      }`;

    if (editingMagnetId) {
      onUpdateShiftMagnet(editingMagnetId, {
        keywordTrigger: cleanKw,
        workingTitle: cleanTitle,
        trackingLink: cleanUrl,
        dmHandoffScript: finalScript,
        status: cleanUrl ? 'Live' : 'Draft'
      });
    } else {
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
        dmHandoffScript: finalScript,
        dmDiagnosticQuestion: '',
        dmBridgeScript: '',
        status: cleanUrl ? 'Live' : 'Draft'
      };
      onAddShiftMagnet(newMagnet);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="glass-panel rounded-xl px-5 py-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white tracking-wide uppercase">
            Shift Magnets &amp; Keyword Triggers
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Add your Lead Magnet URLs and the comment keywords that trigger them in DMs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenLiveCrm && (
            <button
              type="button"
              onClick={onOpenLiveCrm}
              className="px-3.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Connect IG/FB &amp; Test</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#09ADEF]" />
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="btn-2mm px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead Magnet</span>
          </button>
        </div>
      </div>

      {/* Clean Lead Magnet Cards (Single Card Border Level) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {student.shiftMagnets.map(mag => (
          <div
            key={mag.id}
            className="glass-panel rounded-xl p-4 border border-white/10 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2.5 py-0.5 rounded bg-[#09ADEF]/15 font-mono text-xs font-bold text-[#09ADEF] shrink-0">
                    {mag.keywordTrigger}
                  </span>
                  <h2 className="text-sm font-bold text-white truncate">{mag.workingTitle}</h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(mag)}
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
                      title="Delete Lead Magnet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lead Magnet URL */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] text-xs">
                {mag.trackingLink && isSafeHttpUrl(mag.trackingLink) ? (
                  <>
                    <a
                      href={mag.trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#09ADEF] hover:underline truncate inline-flex items-center gap-1.5"
                    >
                      <span className="truncate">{mag.trackingLink}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(`url-${mag.id}`, mag.trackingLink)}
                      className="text-[11px] text-neutral-400 hover:text-white shrink-0 cursor-pointer"
                    >
                      {copiedId === `url-${mag.id}` ? 'Copied' : 'Copy URL'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openEditModal(mag)}
                    className="text-amber-300 hover:underline text-xs cursor-pointer"
                  >
                    + Click Edit to add your Lead Magnet URL
                  </button>
                )}
              </div>

              {/* Auto-Reply DM Script Preview */}
              {mag.dmHandoffScript && (
                <div className="p-3 rounded-lg bg-white/[0.03] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Auto-Reply DM Message
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`dm-${mag.id}`, mag.dmHandoffScript)}
                      className="text-[11px] text-neutral-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `dm-${mag.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === `dm-${mag.id}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-neutral-300 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                    {mag.dmHandoffScript}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Minimal Add / Edit Lead Magnet Modal (Max 3 inputs visible by default) */}
      <ModalDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMagnetId ? 'Edit Lead Magnet & Keyword' : 'Add Lead Magnet & Keyword'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {!editingMagnetId && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-neutral-400">
                Optional Starter Templates:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map(p => (
                  <button
                    key={p.keywordTrigger}
                    type="button"
                    onClick={() => {
                      setKeywordTrigger(p.keywordTrigger);
                      setWorkingTitle(p.workingTitle);
                      setDmHandoffScript(p.dmHandoffScript);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-neutral-200 cursor-pointer"
                  >
                    {p.label} ({p.keywordTrigger})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-neutral-300 mb-1">Comment Keyword</label>
              <input
                type="text"
                value={keywordTrigger}
                onChange={e => setKeywordTrigger(e.target.value.toUpperCase())}
                placeholder="AUDIT"
                required
                className="w-full rounded-lg bg-[#0B0D14] border border-white/12 p-2.5 font-mono text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-neutral-300 mb-1">Lead Magnet Name</label>
              <input
                type="text"
                value={workingTitle}
                onChange={e => setWorkingTitle(e.target.value)}
                placeholder="The 7-Hour Pipeline Equity Audit"
                required
                className="w-full rounded-lg bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-neutral-300 mb-1">Lead Magnet URL</label>
            <input
              type="url"
              value={trackingLink}
              onChange={e => setTrackingLink(e.target.value)}
              placeholder="https://yourdomain.com/audit"
              required
              className="w-full rounded-lg bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none"
            />
          </div>

          {showCustomDm && (
            <div>
              <label className="block font-medium text-neutral-300 mb-1">
                Auto-Reply DM Message (sent when someone comments your keyword)
              </label>
              <textarea
                rows={4}
                value={dmHandoffScript}
                onChange={e => setDmHandoffScript(e.target.value)}
                className="w-full rounded-lg bg-[#0B0D14] border border-white/12 p-2.5 text-white focus:border-[#09ADEF] focus:outline-none leading-relaxed"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowCustomDm(v => !v)}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              {showCustomDm ? 'Hide custom DM message' : '+ Customize message'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-white/12 text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-2mm px-5 py-2 rounded-lg font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
