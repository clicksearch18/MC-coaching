import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  FileEdit,
  Award,
  Check,
  AlertTriangle,
  Pencil,
  Plus,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { WorkbookWeek, StudentProfile } from '../types';
import { ModalDialog } from './ModalDialog';

interface WorkbookViewProps {
  student: StudentProfile;
  lessons: WorkbookWeek[];
  isCoachMode?: boolean;
  onUpdateLesson: (lessonNumber: number, updated: WorkbookWeek) => void;
  onResetLessonsToDefault: () => void;
  onToggleTask: (lessonNumber: number, taskIdx: number) => void;
  onUpdateField: (fieldId: string, value: string) => void;
  onUpdateRubric: (key: string, score: 'WEAK' | 'ACCEPTABLE' | 'STRONG') => void;
  onSubmitPhaseGate: (phaseNumber: number, nextLesson: number) => void;
}

const PHASES = [
  { num: 1, range: 'Lessons 1–4', name: 'Foundation', desc: 'What You Say' },
  { num: 2, range: 'Lessons 5–8', name: 'Raw Material', desc: 'Story Bank & Matrix' },
  { num: 3, range: 'Lessons 9–18', name: 'Production', desc: '25 Videos + VSL' },
  { num: 4, range: 'Lessons 19–22', name: 'Distribution', desc: '$5 Ads & DMs' },
  { num: 5, range: 'Lessons 23–26', name: 'Conversion', desc: 'Events & Offer Doc' }
];

export const WorkbookView: React.FC<WorkbookViewProps> = ({
  student,
  lessons,
  isCoachMode,
  onUpdateLesson,
  onResetLessonsToDefault,
  onToggleTask,
  onUpdateField,
  onUpdateRubric,
  onSubmitPhaseGate
}) => {
  const [selectedLessonNum, setSelectedLessonNum] = useState<number>(student.currentWeek || 1);
  const [activePanel, setActivePanel] = useState<'LESSON' | 'WORKSHEET' | 'RUBRIC'>('LESSON');
  const [showWorkedExample, setShowWorkedExample] = useState<boolean>(true);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  const activeLesson = lessons.find(w => w.weekNumber === selectedLessonNum) || lessons[0];
  const lessonsInCurrentPhase = lessons.filter(w => w.phase === activeLesson.phase);

  // Extract unique field sections for the active lesson
  const worksheetSections = Array.from(
    new Set(activeLesson.fields.map(f => f.section || 'Worksheet Prompts'))
  );
  const activeSectionFilter =
    selectedSection === 'ALL' || !worksheetSections.includes(selectedSection)
      ? 'ALL'
      : selectedSection;

  // Draft state for editing a lesson
  const [draftLesson, setDraftLesson] = useState<WorkbookWeek>(activeLesson);

  const openEditor = () => {
    setDraftLesson(JSON.parse(JSON.stringify(activeLesson)));
    setShowEditModal(true);
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLesson(activeLesson.weekNumber, draftLesson);
    setShowEditModal(false);
  };

  const totalTasksCount = lessons.reduce((acc, l) => acc + l.tasks.length, 0);
  const totalFieldsCount = lessons.reduce((acc, l) => acc + l.fields.length, 0);
  const completedTasksCount = Object.values(student.tasksCompleted).filter(Boolean).length;
  const filledFieldsCount = Object.values(student.worksheetAnswers).filter(v => v && v.trim().length > 0).length;

  const lessonTasksDoneCount = activeLesson.tasks.filter(
    (_, idx) => student.tasksCompleted[`${activeLesson.weekNumber}-${idx}`]
  ).length;
  const lessonFieldsFilledCount = activeLesson.fields.filter(
    f => (student.worksheetAnswers[f.id] || '').trim().length > 0
  ).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Self-Paced Framing Banner (Compact on mobile, full on desktop) */}
      <div className="glass-panel rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[11px] font-semibold">
            26 Self-Paced Lessons
          </span>
          <span className="hidden sm:inline text-xs text-slate-400">
            Pace on the gate, not the calendar — 26 weeks is just a relaxed 1-lesson/week baseline.
          </span>
          <span className="sm:hidden text-[11px] text-slate-400 truncate">
            Tasks {completedTasksCount}/{totalTasksCount} · Fields {filledFieldsCount}/{totalFieldsCount}
          </span>
        </div>

        {isCoachMode && (
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-[11px] sm:text-xs font-semibold text-sky-300 transition-colors cursor-pointer shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Lesson {activeLesson.weekNumber} (Admin CMS)</span>
            <span className="sm:hidden">Edit CMS</span>
          </button>
        )}
      </div>

      {/* Top Sleek Phase Navigation & Global Progress Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* 5 Phase Selector Pills (Horizontal swipe strip on mobile) */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-0.5">
          {PHASES.map(p => {
            const isSelectedPhase = activeLesson.phase === p.num;
            const firstLesson = lessons.find(w => w.phase === p.num)?.weekNumber || 1;
            return (
              <button
                key={p.num}
                type="button"
                onClick={() => {
                  setSelectedLessonNum(firstLesson);
                  setSelectedSection('ALL');
                  setActivePanel('LESSON');
                }}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 shrink-0 ${
                  isSelectedPhase
                    ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm'
                    : 'bg-white/[0.03] border-white/8 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold ${
                    isSelectedPhase ? 'bg-sky-400 text-slate-950' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {p.num}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-none">{p.name}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{p.range}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Compact Global Counters (Desktop Only — shown inline in top banner on mobile) */}
        <div className="hidden sm:flex items-center gap-2.5 self-start lg:self-auto">
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/8 text-xs">
            <span className="text-slate-400 mr-1.5">Tasks:</span>
            <span className="font-semibold text-white">{completedTasksCount}/{totalTasksCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/8 text-xs">
            <span className="text-slate-400 mr-1.5">Fields:</span>
            <span className="font-semibold text-white">{filledFieldsCount}/{totalFieldsCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs">
            <span className="text-sky-300 mr-1.5">Time on Brand:</span>
            <span className="font-semibold text-white">{student.minutesAvailableCurrent}m / 420m</span>
          </div>
        </div>
      </div>

      {/* Mobile-Only Compact Lesson Switcher Bar (Replaces bulky sidebar on mobile) */}
      <div className="lg:hidden glass-panel rounded-xl p-2.5 flex items-center gap-2">
        <button
          type="button"
          disabled={selectedLessonNum <= 1}
          onClick={() => {
            setSelectedLessonNum(n => Math.max(1, n - 1));
            setSelectedSection('ALL');
            setActivePanel('LESSON');
          }}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/8 text-slate-300 disabled:opacity-30 shrink-0"
          aria-label="Previous Lesson"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <select
          value={selectedLessonNum}
          onChange={e => {
            setSelectedLessonNum(Number(e.target.value));
            setSelectedSection('ALL');
            setActivePanel('LESSON');
          }}
          aria-label="Select lesson"
          className="flex-1 min-w-0 rounded-lg bg-[#0B0D14] border border-white/12 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
        >
          {lessons.map(l => (
            <option key={l.weekNumber} value={l.weekNumber}>
              Lesson {String(l.weekNumber).padStart(2, '0')}: {l.title} {l.isPhaseGate ? '◆ Gate' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={selectedLessonNum >= 26}
          onClick={() => {
            setSelectedLessonNum(n => Math.min(26, n + 1));
            setSelectedSection('ALL');
            setActivePanel('LESSON');
          }}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/8 text-slate-300 disabled:opacity-30 shrink-0"
          aria-label="Next Lesson"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Split Layout: Left Lessons Menu (Desktop) + Right Sequential Lesson/Worksheet/Gate Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 3 Columns: Clean Lesson Menu for Active Phase (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-3 glass-panel rounded-2xl p-4 space-y-3">
          <div className="px-2 py-1 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                Phase 0{activeLesson.phase} Lessons
              </div>
              <h3 className="text-sm font-semibold text-white mt-0.5">
                Select Lesson
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">{lessonsInCurrentPhase.length} Lessons</span>
          </div>

          <div className="space-y-1.5">
            {lessonsInCurrentPhase.map(lesson => {
              const isSelected = lesson.weekNumber === selectedLessonNum;
              const allTasksDone = lesson.tasks.every(
                (_, idx) => student.tasksCompleted[`${lesson.weekNumber}-${idx}`]
              );
              return (
                <button
                  key={lesson.weekNumber}
                  type="button"
                  onClick={() => {
                    setSelectedLessonNum(lesson.weekNumber);
                    setSelectedSection('ALL');
                    setActivePanel('LESSON');
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-400 text-white'
                      : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-sky-400">
                        Lesson {String(lesson.weekNumber).padStart(2, '0')}
                      </span>
                      {lesson.isPhaseGate && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                          Gate
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-100 mt-0.5 line-clamp-2">
                      {lesson.title}
                    </div>
                  </div>
                  {allTasksDone && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* All 26 Lessons Quick Dropdown for fast jumping */}
          <div className="pt-3 border-t border-white/8">
            <label className="block text-[11px] text-slate-400 mb-1.5 px-1">
              Jump to any of the 26 lessons:
            </label>
            <select
              value={selectedLessonNum}
              onChange={e => {
                setSelectedLessonNum(Number(e.target.value));
                setSelectedSection('ALL');
                setActivePanel('LESSON');
              }}
              className="w-full rounded-xl bg-[#0B0D14] border border-white/12 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
            >
              {lessons.map(l => (
                <option key={l.weekNumber} value={l.weekNumber}>
                  Lesson {String(l.weekNumber).padStart(2, '0')}: {l.title} {l.isPhaseGate ? '(Phase Gate)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right 9 Columns: Sequential Stepper for Active Lesson (1. Lesson -> 2. Worksheet -> 3. Gate Rubric) */}
        <div className="lg:col-span-9 space-y-4 sm:space-y-5">
          {/* Lesson Header & 3-Step Sequential Panel Switcher */}
          <div className="glass-panel rounded-2xl p-4 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] sm:text-xs font-semibold">
                  Lesson {activeLesson.weekNumber}/26 · Mod {activeLesson.moduleNumber}
                </span>
                {activeLesson.isPhaseGate && (
                  <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-semibold">
                    ◆ Phase Gate
                  </span>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={selectedLessonNum <= 1}
                  onClick={() => {
                    setSelectedLessonNum(n => Math.max(1, n - 1));
                    setSelectedSection('ALL');
                    setActivePanel('LESSON');
                  }}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Previous Lesson"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={selectedLessonNum >= 26}
                  onClick={() => {
                    setSelectedLessonNum(n => Math.min(26, n + 1));
                    setSelectedSection('ALL');
                    setActivePanel('LESSON');
                  }}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Next Lesson"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
              Lesson {activeLesson.weekNumber}: {activeLesson.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 sm:mt-1.5 leading-relaxed">{activeLesson.subtitle}</p>

            {/* 3-Step Sequential Module Tabs (Single compact 3-col row on mobile!) */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/8">
              <button
                type="button"
                onClick={() => setActivePanel('LESSON')}
                className={`p-2.5 sm:p-3.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 ${
                  activePanel === 'LESSON'
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-white/[0.02] border-white/8 text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activePanel === 'LESSON' ? 'bg-sky-400 text-slate-950' : 'bg-white/8 text-slate-300'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold truncate">
                    <span className="sm:hidden">1. Lesson</span>
                    <span className="hidden sm:inline">1. Lesson & Action Tasks</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] opacity-75 truncate">
                    {lessonTasksDoneCount}/{activeLesson.tasks.length} tasks
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel('WORKSHEET')}
                className={`p-2.5 sm:p-3.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 ${
                  activePanel === 'WORKSHEET'
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-white/[0.02] border-white/8 text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activePanel === 'WORKSHEET' ? 'bg-sky-400 text-slate-950' : 'bg-white/8 text-slate-300'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold truncate">
                    <span className="sm:hidden">2. Worksheet</span>
                    <span className="hidden sm:inline">2. Interactive Worksheet</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] opacity-75 truncate">
                    {lessonFieldsFilledCount}/{activeLesson.fields.length} fields
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel('RUBRIC')}
                className={`p-2.5 sm:p-3.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 ${
                  activePanel === 'RUBRIC'
                    ? 'bg-sky-500/15 border-sky-400 text-white'
                    : 'bg-white/[0.02] border-white/8 text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activePanel === 'RUBRIC' ? 'bg-sky-400 text-slate-950' : 'bg-white/8 text-slate-300'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold truncate">
                    <span className="sm:hidden">3. Gate Check</span>
                    <span className="hidden sm:inline">3. Done-When & Gate</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] opacity-75 truncate">
                    {activeLesson.rubric ? 'Rubric' : 'Deliverable'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* SEQUENTIAL PANEL 1: THE LESSON, REFERENCE FIGURES & ACTION CHECKLIST */}
          {activePanel === 'LESSON' && (
            <div className="glass-panel rounded-2xl p-4 sm:p-8 space-y-5 sm:space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Part 1 · Core Lesson Principles
                </span>
                <ul className="space-y-2.5 sm:space-y-3 mt-3">
                  {activeLesson.lessonBullets.map((b, idx) => (
                    <li
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/8 text-xs sm:text-sm text-slate-200 flex items-start gap-3 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 1-to-1 PDF Reference Figures (FIG. 00 through FIG. 28) — Collapsible on mobile */}
              {activeLesson.referenceFigures && activeLesson.referenceFigures.length > 0 && (
                <div className="pt-4 border-t border-white/8 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 block">
                    Workbook Reference Figures & Frameworks ({activeLesson.referenceFigures.length})
                  </span>
                  {activeLesson.referenceFigures.map((fig, fIdx) => (
                    <details
                      key={`${fig.figNumber}-${fIdx}`}
                      open={fIdx === 0}
                      className="group rounded-xl bg-white/[0.02] border border-white/10 p-3.5 sm:p-5 space-y-3"
                    >
                      <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[11px] font-bold">
                            {fig.figNumber}
                          </span>
                          <h4 className="text-xs sm:text-sm font-semibold text-white">{fig.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {fig.caption && (
                            <span className="hidden sm:inline text-xs text-slate-400">{fig.caption}</span>
                          )}
                          <span className="text-xs text-sky-400 group-open:rotate-90 transition-transform">▸</span>
                        </div>
                      </summary>

                      {fig.cards && fig.cards.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {fig.cards.map((card, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-3.5 rounded-xl bg-[#0B0D14] border border-white/8 space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-white">{card.title}</span>
                                {card.badge && (
                                  <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-semibold">
                                    {card.badge}
                                  </span>
                                )}
                              </div>
                              {card.subtitle && (
                                <div className="text-[11px] font-medium text-sky-400">{card.subtitle}</div>
                              )}
                              <p className="text-xs text-slate-300 leading-relaxed">{card.body}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {fig.headers && fig.rows && (
                        <div className="overflow-x-auto rounded-xl border border-white/8">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-white/[0.04] border-b border-white/10 text-slate-300">
                                {fig.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="p-3 font-semibold">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/8">
                              {fig.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/[0.02]">
                                  {row.map((cell, cellIdx) => (
                                    <td
                                      key={cellIdx}
                                      className={`p-3 leading-relaxed ${
                                        cellIdx === 0 ? 'font-semibold text-white' : 'text-slate-300'
                                      }`}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-white/8">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 block mb-3">
                  Part 2 · Do The Work (Action Checklist)
                </span>
                <div className="space-y-2">
                  {activeLesson.tasks.map((taskText, idx) => {
                    const key = `${activeLesson.weekNumber}-${idx}`;
                    const isChecked = !!student.tasksCompleted[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onToggleTask(activeLesson.weekNumber, idx)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-300'
                            : 'bg-white/[0.02] border-white/8 hover:border-sky-400/50 text-white'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        )}
                        <span className={`text-xs sm:text-sm leading-relaxed ${isChecked ? 'line-through text-slate-400' : ''}`}>
                          {taskText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coaching Prompt & Failure Trap Callout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-white/8">
                <div className="p-3.5 sm:p-4 rounded-xl bg-sky-500/[0.06] border border-sky-500/20">
                  <div className="text-[11px] sm:text-xs font-semibold text-sky-300 uppercase tracking-wider mb-1">
                    Coaching Reflection Prompt
                  </div>
                  <p className="text-xs sm:text-sm italic text-slate-200 leading-relaxed">
                    “{activeLesson.coachingPrompt}”
                  </p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/[0.06] border border-rose-500/20">
                  <div className="text-[11px] sm:text-xs font-semibold text-rose-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Where It Fails
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{activeLesson.whereItFails}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePanel('WORKSHEET')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  <span>Continue to Lesson {activeLesson.weekNumber} Worksheet</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SEQUENTIAL PANEL 2: INTERACTIVE WORKSHEET (WITH SECTION ORGANIZER) */}
          {activePanel === 'WORKSHEET' && (
            <div className="glass-panel rounded-2xl p-4 sm:p-8 space-y-4 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 sm:pb-4 border-b border-white/8">
                <div>
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-sky-400">
                    Lesson {activeLesson.weekNumber} Worksheet · {activeLesson.fields.length} Fields
                  </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-white mt-0.5">
                    {activeLesson.moduleTitle}
                  </h2>
                </div>

                {activeLesson.workedExample && (
                  <button
                    type="button"
                    onClick={() => setShowWorkedExample(v => !v)}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] sm:text-xs font-medium text-sky-300 cursor-pointer"
                  >
                    {showWorkedExample ? 'Hide Example' : 'Worked Example'}
                  </button>
                )}
              </div>

              {activeLesson.workedExample && showWorkedExample && (
                <div className="p-3.5 sm:p-5 rounded-xl bg-sky-500/[0.05] border border-sky-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-300">
                    <span>◆ Worked Example · {activeLesson.workedExample.title}</span>
                    <span className="text-slate-400">{activeLesson.workedExample.company}</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {activeLesson.workedExample.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-0.5 sm:gap-1 text-xs">
                        <span className="sm:col-span-4 font-semibold text-slate-400">{item.label}</span>
                        <span className="sm:col-span-8 text-slate-200">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Filter Bar when a worksheet has multiple sections (Horizontal scroll strip on mobile) */}
              {worksheetSections.length > 1 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Worksheet Sections ({worksheetSections.length} parts):
                  </div>
                  <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSection('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        activeSectionFilter === 'ALL'
                          ? 'bg-sky-500/20 border-sky-400 text-white'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({activeLesson.fields.length})
                    </button>
                    {worksheetSections.map(sec => {
                      const secFields = activeLesson.fields.filter(
                        f => (f.section || 'Worksheet Prompts') === sec
                      );
                      const secDone = secFields.filter(
                        f => (student.worksheetAnswers[f.id] || '').trim().length > 0
                      ).length;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSelectedSection(sec)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            activeSectionFilter === sec
                              ? 'bg-sky-500/20 border-sky-400 text-white'
                              : 'bg-white/[0.03] border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span>{sec}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-sky-300">
                            {secDone}/{secFields.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Render Grouped Sections */}
              <div className="space-y-4 sm:space-y-6">
                {worksheetSections
                  .filter(sec => activeSectionFilter === 'ALL' || sec === activeSectionFilter)
                  .map(sectionName => {
                    const sectionFields = activeLesson.fields.filter(
                      f => (f.section || 'Worksheet Prompts') === sectionName
                    );
                    return (
                      <div
                        key={sectionName}
                        className="p-3.5 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/8 space-y-3.5 sm:space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                            {sectionName}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            {
                              sectionFields.filter(
                                f => (student.worksheetAnswers[f.id] || '').trim().length > 0
                              ).length
                            }{' '}
                            of {sectionFields.length} completed
                          </span>
                        </div>

                        <div className="space-y-4">
                          {sectionFields.map(field => {
                            const val = student.worksheetAnswers[field.id] || '';
                            return (
                              <div key={field.id} className="space-y-1.5">
                                <label htmlFor={field.id} className="block text-xs font-semibold text-slate-200">
                                  {field.label}
                                </label>
                                {field.multiline ? (
                                  <textarea
                                    id={field.id}
                                    rows={3}
                                    value={val}
                                    onChange={e => onUpdateField(field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    className="w-full rounded-xl bg-[#0B0D14] border border-white/12 focus:border-sky-400 p-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none leading-relaxed"
                                  />
                                ) : (
                                  <input
                                    id={field.id}
                                    type="text"
                                    value={val}
                                    onChange={e => onUpdateField(field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    className="w-full rounded-xl bg-[#0B0D14] border border-white/12 focus:border-sky-400 p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-4 border-t border-white/8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActivePanel('LESSON')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Lesson
                </button>
                <button
                  type="button"
                  onClick={() => setActivePanel('RUBRIC')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                >
                  <span>Next: Done-When Test & Gate Review</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SEQUENTIAL PANEL 3: DONE-WHEN TEST, MODULE 11 EDITING QA & RUBRIC */}
          {activePanel === 'RUBRIC' && (
            <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  Step 3 · Gate Verification
                </span>
                <h2 className="text-xl font-semibold text-white mt-0.5">
                  Deliverable & “Done When” Verification
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/8">
                  <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1.5">
                    Required Deliverable
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{activeLesson.deliverable}</p>
                </div>
                <div className="p-5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/25">
                  <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Done When Test
                  </div>
                  <p className="text-sm text-slate-100 leading-relaxed">{activeLesson.doneWhen}</p>
                </div>
              </div>

              {/* Module 11 Editing QA Checklist (14-Point Pre-Publish Check for Production Lessons) */}
              {activeLesson.editingQaChecklist && activeLesson.editingQaChecklist.length > 0 && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                      Module 11 · Pre-Publish Editing QA Checklist
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Every video must pass all 14 Content, Craft, and Delivery QA checks before publishing.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeLesson.editingQaChecklist.map((group, gIdx) => (
                      <div
                        key={group.category}
                        className="p-4 rounded-xl bg-[#0B0D14] border border-white/8 space-y-2.5"
                      >
                        <div className="text-xs font-bold uppercase tracking-wider text-sky-300 border-b border-white/8 pb-2">
                          {group.category}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((itemText, iIdx) => {
                            const qaKey = `qa_${activeLesson.weekNumber}_${gIdx}_${iIdx}`;
                            const isChecked = student.worksheetAnswers[qaKey] === 'true';
                            return (
                              <button
                                key={qaKey}
                                type="button"
                                onClick={() =>
                                  onUpdateField(qaKey, isChecked ? '' : 'true')
                                }
                                className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-start gap-2 transition-colors cursor-pointer ${
                                  isChecked
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-300'
                                    : 'bg-white/[0.02] border-white/8 text-slate-200 hover:border-sky-400/40'
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                )}
                                <span className={isChecked ? 'line-through text-slate-400' : ''}>
                                  {itemText}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeLesson.rubric && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-300">
                    Self-Score Quality Rubric (Click Weak, Acceptable, or Strong for each row):
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/[0.04] border-b border-white/10 text-slate-300">
                          <th className="p-3.5 font-semibold">Criterion</th>
                          <th className="p-3.5 font-semibold">Weak</th>
                          <th className="p-3.5 font-semibold">Acceptable</th>
                          <th className="p-3.5 font-semibold text-emerald-300">Strong (Target)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {activeLesson.rubric.map(row => {
                          const scoreKey = `${activeLesson.weekNumber}-${row.criterion}`;
                          const currentScore = student.rubricScores[scoreKey];
                          return (
                            <tr key={row.criterion}>
                              <td className="p-3.5 font-semibold text-white">{row.criterion}</td>
                              <td
                                onClick={() => onUpdateRubric(scoreKey, 'WEAK')}
                                className={`p-3.5 cursor-pointer transition-colors ${
                                  currentScore === 'WEAK'
                                    ? 'bg-rose-500/20 text-rose-200 font-medium'
                                    : 'text-slate-400 hover:bg-white/[0.03]'
                                }`}
                              >
                                {row.weak}
                              </td>
                              <td
                                onClick={() => onUpdateRubric(scoreKey, 'ACCEPTABLE')}
                                className={`p-3.5 cursor-pointer transition-colors ${
                                  currentScore === 'ACCEPTABLE'
                                    ? 'bg-amber-500/20 text-amber-200 font-medium'
                                    : 'text-slate-300 hover:bg-white/[0.03]'
                                }`}
                              >
                                {row.acceptable}
                              </td>
                              <td
                                onClick={() => onUpdateRubric(scoreKey, 'STRONG')}
                                className={`p-3.5 cursor-pointer transition-colors ${
                                  currentScore === 'STRONG'
                                    ? 'bg-emerald-500/20 text-emerald-200 font-semibold'
                                    : 'text-slate-100 hover:bg-white/[0.03]'
                                }`}
                              >
                                {row.strong}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActivePanel('WORKSHEET')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Worksheet
                </button>

                {activeLesson.isPhaseGate ? (
                  <button
                    type="button"
                    onClick={() =>
                      onSubmitPhaseGate(activeLesson.phase, Math.min(26, activeLesson.weekNumber + 1))
                    }
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <span>◆ Submit Phase 0{activeLesson.phase} Gate for Coach Sign-Off</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLessonNum(n => Math.min(26, n + 1));
                      setActivePanel('LESSON');
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <span>
                      Complete Lesson {activeLesson.weekNumber} & Advance to Lesson{' '}
                      {Math.min(26, activeLesson.weekNumber + 1)}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Curriculum Editor Modal (Update Lessons 1-26 Over Time) */}
      <ModalDialog
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit Lesson ${activeLesson.weekNumber} Curriculum`}
        subtitle="Live Curriculum CMS · Changes Persist Immediately"
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSaveEditor} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">Lesson Title</label>
              <input
                type="text"
                required
                value={draftLesson.title}
                onChange={e => setDraftLesson({ ...draftLesson, title: e.target.value })}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Worksheet Title</label>
              <input
                type="text"
                value={draftLesson.moduleTitle}
                onChange={e => setDraftLesson({ ...draftLesson, moduleTitle: e.target.value })}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Lesson Overview / Subtitle</label>
            <textarea
              rows={2}
              value={draftLesson.subtitle}
              onChange={e => setDraftLesson({ ...draftLesson, subtitle: e.target.value })}
              className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </div>

          {/* Editable Lesson Bullets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Core Lesson Bullets</label>
              <button
                type="button"
                onClick={() =>
                  setDraftLesson({
                    ...draftLesson,
                    lessonBullets: [...draftLesson.lessonBullets, 'New lesson principle...']
                  })
                }
                className="text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Bullet
              </button>
            </div>
            {draftLesson.lessonBullets.map((b, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={b}
                  onChange={e => {
                    const updated = [...draftLesson.lessonBullets];
                    updated[idx] = e.target.value;
                    setDraftLesson({ ...draftLesson, lessonBullets: updated });
                  }}
                  className="flex-1 rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraftLesson({
                      ...draftLesson,
                      lessonBullets: draftLesson.lessonBullets.filter((_, i) => i !== idx)
                    })
                  }
                  className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Editable Action Tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Action Tasks (“Do The Work”)</label>
              <button
                type="button"
                onClick={() =>
                  setDraftLesson({
                    ...draftLesson,
                    tasks: [...draftLesson.tasks, 'New action item...']
                  })
                }
                className="text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>
            {draftLesson.tasks.map((t, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={t}
                  onChange={e => {
                    const updated = [...draftLesson.tasks];
                    updated[idx] = e.target.value;
                    setDraftLesson({ ...draftLesson, tasks: updated });
                  }}
                  className="flex-1 rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraftLesson({
                      ...draftLesson,
                      tasks: draftLesson.tasks.filter((_, i) => i !== idx)
                    })
                  }
                  className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Deliverable</label>
              <textarea
                rows={2}
                value={draftLesson.deliverable}
                onChange={e => setDraftLesson({ ...draftLesson, deliverable: e.target.value })}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Done When Test</label>
              <textarea
                rows={2}
                value={draftLesson.doneWhen}
                onChange={e => setDraftLesson({ ...draftLesson, doneWhen: e.target.value })}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Coaching Reflection Prompt</label>
              <input
                type="text"
                value={draftLesson.coachingPrompt}
                onChange={e => setDraftLesson({ ...draftLesson, coachingPrompt: e.target.value })}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Where It Fails</label>
              <input
                type="text"
                value={draftLesson.whereItFails}
                onChange={e => setDraftLesson({ ...draftLesson, whereItFails: e.target.value })}
                className="w-full rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Editable Worksheet Fields */}
          <div className="space-y-2 pt-2 border-t border-white/8">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300">Interactive Worksheet Prompts</label>
              <button
                type="button"
                onClick={() =>
                  setDraftLesson({
                    ...draftLesson,
                    fields: [
                      ...draftLesson.fields,
                      {
                        id: `custom_l${draftLesson.weekNumber}_${Date.now()}`,
                        label: 'NEW WORKSHEET PROMPT',
                        placeholder: 'Enter answer...',
                        multiline: true
                      }
                    ]
                  })
                }
                className="text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Worksheet Prompt
              </button>
            </div>
            {draftLesson.fields.map((f, idx) => (
              <div key={f.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={f.label}
                  onChange={e => {
                    const updated = [...draftLesson.fields];
                    updated[idx] = { ...f, label: e.target.value };
                    setDraftLesson({ ...draftLesson, fields: updated });
                  }}
                  placeholder="Field label"
                  className="sm:col-span-6 rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-white focus:border-sky-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={f.placeholder || ''}
                  onChange={e => {
                    const updated = [...draftLesson.fields];
                    updated[idx] = { ...f, placeholder: e.target.value };
                    setDraftLesson({ ...draftLesson, fields: updated });
                  }}
                  placeholder="Placeholder hint"
                  className="sm:col-span-5 rounded-xl bg-[#0B0D14] border border-white/15 p-2.5 text-slate-300 focus:border-sky-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDraftLesson({
                      ...draftLesson,
                      fields: draftLesson.fields.filter((_, i) => i !== idx)
                    })
                  }
                  className="sm:col-span-1 p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onResetLessonsToDefault();
                setShowEditModal(false);
              }}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All 26 Lessons to Default
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-xl border border-white/12 px-4 py-2.5 font-medium text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-5 py-2.5 cursor-pointer"
              >
                Save Lesson {activeLesson.weekNumber} Changes
              </button>
            </div>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
};
