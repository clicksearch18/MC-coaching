import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Smartphone,
  Activity,
  Link2
} from 'lucide-react';
import { StudentProfile } from '../types';

interface CoachDashboardViewProps {
  students: StudentProfile[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
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
  onSendMessage,
  onTriggerMissedAlertPush,
  onApproveGate,
  onOpenImportModal
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [coachSubTab, setCoachSubTab] = useState<'MESSAGE' | 'LINKS' | 'TELEMETRY'>('MESSAGE');
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

  const completedSupporting = activeStudent.supportingVideos.filter(v => v.status === 'Completed');

  return (
    <div className="space-y-6">
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

      {/* Main Split: Left Student Roster + Right Focused Student Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Cols: Sleek Student Roster */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-4 space-y-2.5">
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Cohort Roster</span>
            <span className="text-[11px] text-slate-400">Select to manage</span>
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
                  <span className="text-sky-400 font-medium">{doneVideos}/50 Videos</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 8 Cols: Selected Student Workspace with Clean Sub-Tabs */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Student Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/8">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-sky-400">
                  Lesson {activeStudent.currentWeek} · Phase 0{activeStudent.currentPhase}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-400">Last active {activeStudent.lastActive}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-0.5">
                {activeStudent.name} — {activeStudent.company}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-slate-200 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                <span>Upload Content Plan</span>
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

          {/* 3 Clean Workspace Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/8">
            {[
              { id: 'MESSAGE' as const, label: 'Direct Chat & Push Nudge', icon: MessageSquare },
              { id: 'LINKS' as const, label: `Verified Social Links (${completedSupporting.length})`, icon: Link2 },
              { id: 'TELEMETRY' as const, label: 'Attention Metrics & Workbook', icon: Activity }
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
    </div>
  );
};
