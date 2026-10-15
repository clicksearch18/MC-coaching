import React, { useState } from 'react';
import {
  Magnet,
  Plus,
  Copy,
  Check,
  MessageSquare,
  Repeat
} from 'lucide-react';
import { StudentProfile, ShiftMagnet } from '../types';
import { ModalDialog } from './ModalDialog';

interface ShiftMagnetsViewProps {
  student: StudentProfile;
  onAddShiftMagnet: (magnet: ShiftMagnet) => void;
  onUpdateShiftMagnet: (id: string, updates: Partial<ShiftMagnet>) => void;
}

const DM_MATRIX_STAGES = [
  {
    letter: 'S',
    stage: 'Signal the Connection',
    function: 'Re-establish context and relevance',
    question: 'Why are you messaging me?',
    asset: 'Reminder tied to their comment/action',
    result: 'Recognition'
  },
  {
    letter: 'H',
    stage: 'Highlight the Constraint',
    function: 'Diagnose the immediate problem',
    question: 'Which problem is mine?',
    asset: 'Three-option A / B / C diagnostic',
    result: 'Identification'
  },
  {
    letter: 'I',
    stage: 'Illuminate the Issue',
    function: 'Reveal the deeper cause',
    question: 'What is actually causing this?',
    asset: 'Insight plus one context question',
    result: 'Trust'
  },
  {
    letter: 'F',
    stage: 'Form the Next Step',
    function: 'Deliver guidance and the promised resource',
    question: 'What should I do first?',
    asset: 'Tailored Shift Magnet recommendation',
    result: 'Value'
  },
  {
    letter: 'T',
    stage: 'Trigger the Transfer',
    function: 'Move toward the broader solution',
    question: 'What is the logical next action?',
    asset: '2-Page Offer Doc, VSL, or Workshop invite',
    result: 'Momentum'
  }
];

const REENGAGEMENT_LEVELS = [
  { level: 'Level 1 (Day 2)', type: 'Context Nudge', script: 'Hey [First name], did you get a chance to look at the [Resource]?' },
  { level: 'Level 2 (Day 5)', type: 'Friction Nudge', script: 'Was there anything in it that didn’t fit your situation?' },
  { level: 'Level 3 (Day 12)', type: 'Outcome Nudge', script: 'Is solving [Specific problem] still a priority right now?' },
  { level: 'Level 4 (Day 30)', type: 'Permission to Close', script: 'Should I close the loop on this for now?' }
];

export const ShiftMagnetsView: React.FC<ShiftMagnetsViewProps> = ({
  student,
  onAddShiftMagnet,
  onUpdateShiftMagnet
}) => {
  const [subTab, setSubTab] = useState<'MAGNETS' | 'DM_MATRIX' | 'REENGAGE'>('MAGNETS');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newPromise, setNewPromise] = useState('');
  const [newBelief, setNewBelief] = useState('');
  const [newFormat, setNewFormat] = useState<ShiftMagnet['deliveryFormat']>('PDF');
  const [newLink, setNewLink] = useState('');
  const [newScript, setNewScript] = useState('');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: ShiftMagnet = {
      id: `mag-${Date.now()}`,
      workingTitle: newTitle.trim(),
      version: 'v1.0',
      specificAudience: newAudience || 'Ideal High-Ticket Operators',
      triggeringProblem: newProblem || 'Stuck in manual client acquisition',
      promiseOneSentence: newPromise || 'Install the exact checklist in under 10 minutes.',
      beliefItShifts: newBelief || student.worksheetAnswers.m02_q4_belief || 'Shifts core belief toward our mechanism',
      completionTime: 'Under 10 minutes',
      deliveryFormat: newFormat,
      keywordTrigger: (newKeyword || 'SHIFT').toUpperCase(),
      trackingLink: newLink || 'https://marketconcussion.com/magnet',
      dmHandoffScript:
        newScript ||
        `Hey [First Name]! Saw you commented ${(newKeyword || 'SHIFT').toUpperCase()} — here is the link to ${newTitle.trim()}. Quick question: what's your #1 bottleneck right now?`,
      status: 'Live'
    };
    onAddShiftMagnet(created);
    setNewTitle('');
    setNewKeyword('');
    setNewAudience('');
    setNewProblem('');
    setNewPromise('');
    setNewBelief('');
    setNewLink('');
    setNewScript('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Segmented Sub-Nav + Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#07090D] border border-white/[0.08] w-full sm:w-auto">
          {[
            { id: 'MAGNETS' as const, label: `Shift Magnets (${student.shiftMagnets.length})`, shortLabel: `Magnets (${student.shiftMagnets.length})`, icon: Magnet },
            { id: 'DM_MATRIX' as const, label: 'S.H.I.F.T. DM Playbook', shortLabel: 'DM Playbook', icon: MessageSquare },
            { id: 'REENGAGE' as const, label: '4-Step Re-Engagement Loop', shortLabel: 'Re-Engage', icon: Repeat }
          ].map(t => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-all cursor-pointer ${
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

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg btn-2mm text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Shift Magnet</span>
        </button>
      </div>

      {/* PANEL 1: SHIFT MAGNETS REPOSITORY (Styled after Results Over Rhetoric cards) */}
      {subTab === 'MAGNETS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {student.shiftMagnets.map(mag => (
            <div
              key={mag.id}
              className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                    KEYWORD: “{mag.keywordTrigger}” · {mag.deliveryFormat}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateShiftMagnet(mag.id, { status: mag.status === 'Live' ? 'Draft' : 'Live' })
                    }
                    className="badge-2mm px-2.5 py-0.5 rounded-full text-[9px] cursor-pointer"
                  >
                    {mag.status}
                  </button>
                </div>

                <div>
                  <h3 className="font-display text-2xl text-white tracking-wide leading-tight">
                    {mag.workingTitle}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">{mag.specificAudience}</p>
                </div>

                {/* Signature Vertical Left-Border THE SHIFT Callout */}
                <div className="border-l-2 border-[#09ADEF]/60 pl-3.5 py-0.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400 block">
                    THE SHIFT:
                  </span>
                  <p className="text-xs text-white leading-relaxed">{mag.beliefItShifts}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 block mb-1">
                    IMMEDIATE WIN ({mag.completionTime}):
                  </span>
                  <p className="text-xs text-white font-semibold leading-relaxed">{mag.promiseOneSentence}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.07] space-y-3">
                <div className="p-3.5 rounded-xl bg-[#040507] border border-white/[0.07] text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                      DM Handoff Opener
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(mag.id, mag.dmHandoffScript)}
                      className="text-[#09ADEF] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === mag.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">“{mag.dmHandoffScript}”</p>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
                  <span className="truncate max-w-[200px]">{mag.trackingLink}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${mag.id}-link`, mag.trackingLink)}
                    className="badge-2mm px-2.5 py-1 rounded-full text-[9px] cursor-pointer"
                  >
                    {copiedId === `${mag.id}-link` ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PANEL 2: S.H.I.F.T. DM MATRIX */}
      {subTab === 'DM_MATRIX' && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Fig. 14 · Conversational Conversion
            </span>
            <h2 className="text-xl font-semibold text-white mt-0.5">
              The 5-Step S.H.I.F.T. DM Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Both CTAs (your Shift Magnet and your VSL) route into a DM conversation that follows these 5 steps.
            </p>
          </div>

          <div className="space-y-3">
            {DM_MATRIX_STAGES.map(s => (
              <div
                key={s.letter}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/8 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs"
              >
                <div className="md:col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold text-base flex items-center justify-center shrink-0">
                    {s.letter}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{s.stage}</div>
                    <div className="text-slate-400 text-[11px]">{s.function}</div>
                  </div>
                </div>
                <div className="md:col-span-3 italic text-slate-300">“{s.question}”</div>
                <div className="md:col-span-3 text-slate-200">{s.asset}</div>
                <div className="md:col-span-2 md:text-right">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-medium text-[11px]">
                    {s.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PANEL 3: 4-LEVEL RE-ENGAGEMENT LOOP */}
      {subTab === 'REENGAGE' && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5 max-w-3xl">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              Fig. 15 · Handling Silence
            </span>
            <h2 className="text-xl font-semibold text-white mt-0.5">
              The 4-Level Re-Engagement Ladder
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Never send “just following up” twice. Each level references the unresolved decision instead of your own patience.
            </p>
          </div>

          <div className="space-y-3">
            {REENGAGEMENT_LEVELS.map(r => (
              <div
                key={r.level}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/8 flex items-center justify-between gap-4"
              >
                <div>
                  <span className="text-xs font-semibold text-sky-400">
                    {r.level} · {r.type}
                  </span>
                  <p className="text-sm text-white mt-1">“{r.script}”</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(r.level, r.script)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-200 shrink-0 cursor-pointer"
                >
                  {copiedId === r.level ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal to Add New Shift Magnet */}
      <ModalDialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Shift Magnet"
        subtitle="Module 16 · Lead Magnet Builder"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-300 mb-1">Working Title *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. The 9-Point Drainage Audit"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Comment Keyword *</label>
              <input
                type="text"
                required
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                placeholder="e.g. AUDIT"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white uppercase focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Specific Audience</label>
              <input
                type="text"
                value={newAudience}
                onChange={e => setNewAudience(e.target.value)}
                placeholder="Who is this for?"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Delivery Format</label>
              <select
                value={newFormat}
                onChange={e => setNewFormat(e.target.value as ShiftMagnet['deliveryFormat'])}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white focus:border-sky-400 focus:outline-none"
              >
                <option value="PDF">PDF Guide</option>
                <option value="Checklist">1-Page Checklist / Scorecard</option>
                <option value="Audit">Self-Audit Tool</option>
                <option value="Custom GPT">Custom GPT / AI Tool</option>
                <option value="Video">Micro-Video (&lt;10m)</option>
                <option value="Class">Workshop / Class</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              The Belief It Shifts
            </label>
            <input
              type="text"
              value={newBelief}
              onChange={e => setNewBelief(e.target.value)}
              placeholder="What false belief does this dismantle?"
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              One-Sentence Promise (&lt;10 Minute Win)
            </label>
            <input
              type="text"
              value={newPromise}
              onChange={e => setNewPromise(e.target.value)}
              placeholder="What do they achieve in the first two minutes?"
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Tracking / Hosted URL</label>
            <input
              type="text"
              value={newLink}
              onChange={e => setNewLink(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              DM Handoff Opener Script
            </label>
            <textarea
              rows={3}
              value={newScript}
              onChange={e => setNewScript(e.target.value)}
              placeholder="Hey [First Name], here is the resource you requested! Quick question..."
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 p-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-xl border border-white/12 px-4 py-2.5 font-medium text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-500 text-slate-950 font-semibold px-5 py-2.5 cursor-pointer"
            >
              Save Shift Magnet
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
