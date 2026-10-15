import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Activity,
  Link2,
  UserPlus,
  Settings,
  Upload,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { StudentProfile, PlaybookPillar, SupportingVideoItem } from '../types';
import { ModalDialog } from './ModalDialog';
import { parseStudentSpreadsheet } from '../utils/excelParser';

interface CoachDashboardViewProps {
  students: StudentProfile[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onAddStudent: (params: {
    name: string;
    company: string;
    niche: string;
    startingLesson: number;
    coreTransformation: string;
    coreBelief: string;
    customPlaybook?: PlaybookPillar[];
    customSupportingVideos?: SupportingVideoItem[];
  }) => void;
  onUpdateStudentSpecifics: (
    studentId: string,
    updates: Partial<StudentProfile>,
    worksheetUpdates?: Record<string, string>
  ) => void;
  onAddCustomVideoToStudent: (
    studentId: string,
    video: { pillarStage: string; title: string; hook1: string; hook2: string; hook3: string }
  ) => void;
  onDeleteStudent: (studentId: string) => void;
  onSendMessage: (studentId: string, text: string, triggerPush?: boolean) => void;
  onTriggerMissedAlertPush: (student: StudentProfile) => void;
  onApproveGate: (studentId: string, phaseNum: number) => void;
  onOpenImportModal: () => void;
}

const QUICK_FOLLOWUP_TEMPLATES = [
  "Hey! Looks like we missed our daily video today — need any help with the hook or shooting setup?",
  "Quick check-in: your Day video is queued up in your Concussion Content (<10 mins). Drop your social link once it's live!",
  "Just reviewed your Workbook Messaging Canvas — strong Core Belief! Ready to clear your Phase Gate.",
  "Awesome streak this week! Keep protecting the daily post and the monthly event."
];

export const CoachDashboardView: React.FC<CoachDashboardViewProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onAddStudent,
  onUpdateStudentSpecifics,
  onAddCustomVideoToStudent,
  onDeleteStudent,
  onSendMessage,
  onTriggerMissedAlertPush,
  onApproveGate,
  onOpenImportModal
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [coachSubTab, setCoachSubTab] = useState<'SETUP' | 'MESSAGE' | 'LINKS' | 'TELEMETRY'>('SETUP');

  // New Student Onboarding Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newNiche, setNewNiche] = useState('');
  const [newStartingLesson, setNewStartingLesson] = useState(1);
  const [newTransformation, setNewTransformation] = useState('');
  const [newBelief, setNewBelief] = useState('');
  const [newParsedPlaybook, setNewParsedPlaybook] = useState<PlaybookPillar[] | undefined>(undefined);
  const [newParsedSupporting, setNewParsedSupporting] = useState<SupportingVideoItem[] | undefined>(undefined);
  const [newUploadStatus, setNewUploadStatus] = useState<string | null>(null);

  // Add Single Custom Video State
  const [customVideoTitle, setCustomVideoTitle] = useState('');
  const [customVideoStage, setCustomVideoStage] = useState('Pillar 1 · Problem Awareness');
  const [customHook1, setCustomHook1] = useState('');
  const [customHook2, setCustomHook2] = useState('');
  const [customHook3, setCustomHook3] = useState('');
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const onCadenceCount = students.filter(s => s.todayVideoStatus === 'COMPLETED').length;
  const pendingCount = students.filter(s => s.todayVideoStatus === 'PENDING').length;
  const missedCount = students.filter(s => s.todayVideoStatus === 'MISSED').length;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(activeStudent.id, messageInput.trim(), true);
    setMessageInput('');
  };

  const handleNewStudentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setNewUploadStatus('Parsing student .xlsx content plan...');
      const parsed = await parseStudentSpreadsheet(file);
      setNewParsedPlaybook(parsed.playbook);
      setNewParsedSupporting(parsed.supporting);
      setNewUploadStatus(
        `✓ Loaded ${parsed.playbook.length} Playbook Pillars & ${parsed.supporting.length} Daily Concussion Content Videos from "${file.name}"`
      );
    } catch (err) {
      setNewUploadStatus(`Error parsing spreadsheet: ${err instanceof Error ? err.message : 'Invalid file'}`);
    }
  };

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCompany.trim()) return;
    onAddStudent({
      name: newName,
      company: newCompany,
      niche: newNiche,
      startingLesson: newStartingLesson,
      coreTransformation: newTransformation,
      coreBelief: newBelief,
      customPlaybook: newParsedPlaybook,
      customSupportingVideos: newParsedSupporting
    });
    setNewName('');
    setNewCompany('');
    setNewNiche('');
    setNewStartingLesson(1);
    setNewTransformation('');
    setNewBelief('');
    setNewParsedPlaybook(undefined);
    setNewParsedSupporting(undefined);
    setNewUploadStatus(null);
    setShowAddStudentModal(false);
  };

  const handleAddCustomVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVideoTitle.trim() || !customHook1.trim()) return;
    onAddCustomVideoToStudent(activeStudent.id, {
      pillarStage: customVideoStage,
      title: customVideoTitle.trim(),
      hook1: customHook1.trim(),
      hook2: customHook2.trim() || customHook1.trim(),
      hook3: customHook3.trim() || customHook1.trim()
    });
    setCustomVideoTitle('');
    setCustomHook1('');
    setCustomHook2('');
    setCustomHook3('');
    setSaveBanner('Added new daily video + hooks to this student’s Concussion Content queue!');
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const completedSupporting = activeStudent.supportingVideos.filter(v => v.status === 'Completed');

  return (
    <div className="space-y-6">
      {/* Admin / Coach Action Header Banner */}
      <div className="glass-panel rounded-2xl px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[11px] font-semibold">
              Coach & Admin Command Center
            </span>
            <span className="text-xs text-slate-400">
              Onboard new students, upload their custom <code className="text-sky-300">.xlsx</code> content plan, edit their specifics, and manage daily accountability.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddStudentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Onboard New Student</span>
          </button>
        </div>
      </div>

      {/* Top Sleek KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-400">Active Cohort</div>
            <div className="text-2xl font-bold text-white mt-1">{students.length} Operators</div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
            {students.length}
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-emerald-300">Posted Today</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{onCadenceCount} Verified</div>
          </div>
          <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
        </div>

        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-amber-300">Due Today</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount} Pending</div>
          </div>
          <span className="w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" />
        </div>

        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-rose-300">Missed Video</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">{missedCount} At Risk</div>
          </div>
          <button
            type="button"
            onClick={() => {
              const missedStudent = students.find(s => s.todayVideoStatus === 'MISSED') || activeStudent;
              onTriggerMissedAlertPush(missedStudent);
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-semibold text-rose-300 cursor-pointer"
          >
            Test Alert
          </button>
        </div>
      </div>

      {/* Main Split: Left Student Roster + Right Focused Student Admin & Coaching Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Cols: Sleek Student Roster + Add Student Button */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-4 space-y-2.5">
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Student Roster ({students.length})</span>
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Student
            </button>
          </div>

          {students.map(st => {
            const isSelected = st.id === activeStudent.id;
            const doneVideos = st.supportingVideos.filter(v => v.status === 'Completed').length;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectStudent(st.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/6 hover:bg-white/[0.05] text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center font-semibold text-sm text-sky-300 shrink-0">
                      {st.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{st.name}</div>
                      <div className="text-xs text-slate-400 truncate">{st.company}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                      st.todayVideoStatus === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : st.todayVideoStatus === 'PENDING'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {st.todayVideoStatus === 'COMPLETED'
                      ? 'Posted'
                      : st.todayVideoStatus === 'PENDING'
                      ? 'Pending'
                      : 'Missed'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2.5 border-t border-white/6">
                  <span>Lesson {st.currentWeek} · Phase {st.currentPhase}</span>
                  <span>{st.streakDays}d Streak</span>
                  <span className="text-sky-400 font-medium">
                    {doneVideos}/{st.supportingVideos.length} Videos
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 8 Cols: Selected Student Workspace with 4 Admin & Coaching Tabs */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Student Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/8">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-sky-400">
                  Lesson {activeStudent.currentWeek} · Phase 0{activeStudent.currentPhase}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-400">{activeStudent.niche}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-0.5">
                {activeStudent.name} — {activeStudent.company}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-semibold text-sky-300 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Upload Student .xlsx Plan</span>
              </button>

              <button
                type="button"
                onClick={() => onApproveGate(activeStudent.id, activeStudent.currentPhase)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold text-emerald-300 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Phase {activeStudent.currentPhase} Gate</span>
              </button>
            </div>
          </div>

          {/* 4 Clean Workspace Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-white/[0.04] border border-white/8">
            {[
              { id: 'SETUP' as const, label: 'Student Setup & Specifics', icon: Settings },
              { id: 'MESSAGE' as const, label: 'Direct Chat & Push Nudge', icon: MessageSquare },
              { id: 'LINKS' as const, label: `Verified Links (${completedSupporting.length})`, icon: Link2 },
              { id: 'TELEMETRY' as const, label: '7-Hour Metrics & Workbook', icon: Activity }
            ].map(tab => {
              const Icon = tab.icon;
              const active = coachSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCoachSubTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {saveBanner && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center justify-between">
              <span>✓ {saveBanner}</span>
              <button
                type="button"
                onClick={() => setSaveBanner(null)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 0: STUDENT SETUP & SPECIFICS (ADMIN) */}
          {coachSubTab === 'SETUP' && (
            <div className="space-y-6">
              {/* Step 1: Upload Student Specific Content Plan (.xlsx) */}
              <div className="p-5 rounded-2xl bg-sky-500/[0.06] border border-sky-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    1. Student Content Plan Spreadsheet (.xlsx)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Currently loaded for <strong>{activeStudent.name}</strong>:{' '}
                    <span className="text-white font-semibold">{activeStudent.playbook.length} Core Pillars</span> &{' '}
                    <span className="text-white font-semibold">
                      {activeStudent.supportingVideos.length} Daily Concussion Content Videos
                    </span>
                    . Upload a new <code className="text-sky-300">.xlsx</code> sheet anytime to replace or update their plan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenImportModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs shrink-0 cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload .xlsx for {activeStudent.name.split(' ')[0]}</span>
                </button>
              </div>

              {/* Step 2: Edit Profile, Current Lesson, & Core Positioning Specifics */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                      2. Student Profile, Lesson Pace & Positioning Specifics
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Changes auto-save immediately to {activeStudent.name}’s student dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveBanner(`Saved ${activeStudent.name}'s profile & specifics!`);
                      setTimeout(() => setSaveBanner(null), 3000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Saved Live</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Student Full Name</label>
                    <input
                      type="text"
                      value={activeStudent.name}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { name: e.target.value })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Company / Brand Name</label>
                    <input
                      type="text"
                      value={activeStudent.company}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { company: e.target.value })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Industry / Niche</label>
                    <input
                      type="text"
                      value={activeStudent.niche}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, { niche: e.target.value })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Assigned Lesson (1–26)</label>
                    <select
                      value={activeStudent.currentWeek}
                      onChange={e => {
                        const wk = Number(e.target.value);
                        const ph = wk <= 4 ? 1 : wk <= 8 ? 2 : wk <= 18 ? 3 : wk <= 22 ? 4 : 5;
                        onUpdateStudentSpecifics(activeStudent.id, {
                          currentWeek: wk,
                          currentPhase: ph
                        });
                      }}
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    >
                      {Array.from({ length: 26 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>
                          Lesson {String(num).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Time on Brand (Mins)</label>
                    <input
                      type="number"
                      value={activeStudent.minutesAvailableCurrent}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          minutesAvailableCurrent: Number(e.target.value)
                        })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Full List Pool (25%)</label>
                    <input
                      type="number"
                      value={activeStudent.fullListSize}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          fullListSize: Number(e.target.value)
                        })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Weekly DM Convos</label>
                    <input
                      type="number"
                      value={activeStudent.dmConversationsWeekly}
                      onChange={e =>
                        onUpdateStudentSpecifics(activeStudent.id, {
                          dmConversationsWeekly: Number(e.target.value)
                        })
                      }
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Core Transformation (Module 02 · Q1)
                    </label>
                    <textarea
                      rows={2}
                      value={activeStudent.worksheetAnswers.m02_q1_transformation || ''}
                      onChange={e =>
                        onUpdateStudentSpecifics(
                          activeStudent.id,
                          {},
                          { m02_q1_transformation: e.target.value }
                        )
                      }
                      placeholder="What specific transformation does this student deliver?"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Core Belief Statement (Module 02 · Q4)
                    </label>
                    <textarea
                      rows={2}
                      value={activeStudent.worksheetAnswers.m02_q4_belief || ''}
                      onChange={e =>
                        onUpdateStudentSpecifics(
                          activeStudent.id,
                          {},
                          { m02_q4_belief: e.target.value }
                        )
                      }
                      placeholder="What is the 1 Core Belief their 25 videos install?"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Add a Custom Video & Hooks Directly to Student's Queue */}
              <form
                onSubmit={handleAddCustomVideo}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-4 text-xs"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  3. Add Custom Video & Hooks to {activeStudent.name.split(' ')[0]}’s Daily Queue
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Video Title / Topic</label>
                    <input
                      type="text"
                      required
                      value={customVideoTitle}
                      onChange={e => setCustomVideoTitle(e.target.value)}
                      placeholder="e.g., Why 90% of Retargeting Ads Fail Without 7 Hours of Content"
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Pillar / Funnel Stage</label>
                    <input
                      type="text"
                      value={customVideoStage}
                      onChange={e => setCustomVideoStage(e.target.value)}
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hook Option 1 (Required)</label>
                    <input
                      type="text"
                      required
                      value={customHook1}
                      onChange={e => setCustomHook1(e.target.value)}
                      placeholder="Contrarian or curiosity hook..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hook Option 2</label>
                    <input
                      type="text"
                      value={customHook2}
                      onChange={e => setCustomHook2(e.target.value)}
                      placeholder="Direct call-out hook..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hook Option 3</label>
                    <input
                      type="text"
                      value={customHook3}
                      onChange={e => setCustomHook3(e.target.value)}
                      placeholder="Story / proof hook..."
                      className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {students.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onDeleteStudent(activeStudent.id)}
                      className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove {activeStudent.name}
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Video to Student Queue</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1: IN-APP MESSAGING & 1-TAP PUSH NUDGES */}
          {coachSubTab === 'MESSAGE' && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">
                  1-Tap Quick Follow-Ups (Click to load message):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_FOLLOWUP_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageInput(tpl)}
                      className="text-left p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/8 text-xs text-slate-200 transition-colors cursor-pointer line-clamp-2"
                    >
                      “{tpl}”
                    </button>
                  ))}
                </div>
              </div>

              {/* Message History */}
              <div className="rounded-2xl bg-[#0B0D14] border border-white/8 p-4 space-y-3 max-h-72 overflow-y-auto">
                {activeStudent.messages.map(m => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      m.isAlert
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                        : m.senderRole === 'COACH'
                        ? 'border-sky-500/30 bg-sky-500/10 text-white ml-8'
                        : 'border-white/10 bg-white/[0.03] text-slate-200 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-semibold text-sky-400">{m.senderName}</span>
                      <span>{m.timestamp}</span>
                    </div>
                    <p className="leading-relaxed text-sm">{m.text}</p>
                  </div>
                ))}
              </div>

              {/* Send Input */}
              <form onSubmit={handleSend} className="flex gap-2.5">
                <input
                  type="text"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder={`Send a message & push notification to ${activeStudent.name}...`}
                  className="flex-1 rounded-xl bg-[#0B0D14] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 cursor-pointer shrink-0 shadow-lg shadow-sky-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Send & Push</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: VERIFIED SOCIAL PROOF LINKS */}
          {coachSubTab === 'LINKS' && (
            <div className="space-y-3">
              {completedSupporting.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No verified social links submitted yet.
                </div>
              ) : (
                completedSupporting
                  .slice()
                  .reverse()
                  .map(v => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/8 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-sky-400">
                          Day #{v.dayNumber} · {v.pillarStage}
                        </div>
                        <div className="text-sm font-medium text-white truncate mt-0.5">{v.title}</div>
                      </div>
                      {v.videoUrl && (
                        <a
                          href={v.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-xs font-medium shrink-0"
                        >
                          <span>Open Post</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          {/* TAB 3: ATTENTION METRICS & WORKBOOK SNAPSHOT */}
          {coachSubTab === 'TELEMETRY' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">Time on Brand</div>
                  <div className="text-2xl font-bold text-sky-400 mt-1">
                    {activeStudent.minutesAvailableCurrent}m
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Baseline: {activeStudent.minutesAvailableBaseline}m
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">The Full List (25%)</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {activeStudent.fullListSize.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Warm retargeting pool</div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">Weekly DM Convos</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {activeStudent.dmConversationsWeekly}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Active threads</div>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="text-xs text-slate-400">Shift Magnets</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">
                    {activeStudent.shiftMagnets.length} Live
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Wired into CTAs</div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/8 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Core Messaging Snapshot (From Module 02)
                </div>
                <div className="text-sm text-slate-200">
                  <strong className="text-white">Core Transformation (Q1):</strong>{' '}
                  {activeStudent.worksheetAnswers.m02_q1_transformation || 'Not entered yet'}
                </div>
                <div className="text-sm text-slate-200">
                  <strong className="text-white">Core Belief (Q4):</strong>{' '}
                  {activeStudent.worksheetAnswers.m02_q4_belief || 'Not entered yet'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Onboard New Student + Upload Their Specifics (.xlsx) */}
      <ModalDialog
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        title="Onboard New Student & Upload Specifics"
        subtitle="Admin Student Provisioning"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleCreateStudentSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Student Full Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Marcus Vance"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Company / Brand Name *</label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="e.g., Apex Commercial Roofing"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Industry / Niche</label>
              <input
                type="text"
                value={newNiche}
                onChange={e => setNewNiche(e.target.value)}
                placeholder="e.g., B2B Commercial Contracting"
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Starting Lesson (1–26)</label>
              <select
                value={newStartingLesson}
                onChange={e => setNewStartingLesson(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              >
                {Array.from({ length: 26 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    Lesson {String(num).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Initial Core Transformation (Optional)
              </label>
              <textarea
                rows={2}
                value={newTransformation}
                onChange={e => setNewTransformation(e.target.value)}
                placeholder="We help [audience] achieve [outcome] without [pain]..."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Initial Core Belief (Optional)
              </label>
              <textarea
                rows={2}
                value={newBelief}
                onChange={e => setNewBelief(e.target.value)}
                placeholder="The #1 belief shift their market needs to hear..."
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Upload Student .xlsx Content Plan right during creation */}
          <div className="pt-2">
            <label className="block font-semibold text-slate-300 mb-1.5">
              Upload Student’s Custom Content Plan Spreadsheet (<code className="text-sky-400">.xlsx</code>)
            </label>
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-500/40 hover:border-sky-400 bg-[#0B0D14] p-6 cursor-pointer transition-colors">
              <Upload className="w-6 h-6 text-sky-400 mb-1.5" />
              <span className="text-xs font-semibold text-white">
                Click to Attach Student’s .xlsx Content Plan (Or leave blank to load default 50-video template)
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                Automatically ingests their 15 Playbook Pillars & 50 Daily Concussion Content Videos + Hooks
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleNewStudentFileChange}
                className="hidden"
              />
            </label>

            {newUploadStatus && (
              <div className="mt-2.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                {newUploadStatus}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(false)}
              className="rounded-xl border border-white/12 px-4 py-2.5 font-medium text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-5 py-2.5 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              Create Student & Load Plan
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
