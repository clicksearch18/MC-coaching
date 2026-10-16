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
  RotateCcw,
  Magnet,
  Sparkles,
  Layers
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
  onCompleteLesson?: (lessonNumber: number, nextLesson: number) => void;
  onSyncShiftMagnetFromLesson21?: () => void;
  requestedLessonNumber?: number | null;
  onClearRequestedLesson?: () => void;
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
  onSubmitPhaseGate,
  onCompleteLesson,
  onSyncShiftMagnetFromLesson21,
  requestedLessonNumber,
  onClearRequestedLesson
}) => {
  const [selectedLessonNum, setSelectedLessonNum] = useState<number>(student.currentWeek || 1);
  const [activePanel, setActivePanel] = useState<'LESSON' | 'WORKSHEET' | 'RUBRIC'>('LESSON');
  const [showWorkedExample, setShowWorkedExample] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showLessonDrawer, setShowLessonDrawer] = useState<boolean>(false);
  const [worksheetSlideIdx, setWorksheetSlideIdx] = useState<number>(0);
  const [figureSlideIdx, setFigureSlideIdx] = useState<number>(0);
  const [confirmResetCurriculum, setConfirmResetCurriculum] = useState<boolean>(false);
  const [confirmIncompleteAdvance, setConfirmIncompleteAdvance] = useState<boolean>(false);
  const [magnetSyncSaved, setMagnetSyncSaved] = useState<boolean>(false);

  React.useEffect(() => {
    setSelectedLessonNum(student.currentWeek || 1);
    setWorksheetSlideIdx(0);
    setFigureSlideIdx(0);
    setConfirmIncompleteAdvance(false);
  }, [student.id]);

  React.useEffect(() => {
    if (requestedLessonNumber && requestedLessonNumber >= 1 && requestedLessonNumber <= 26) {
      setSelectedLessonNum(requestedLessonNumber);
      setWorksheetSlideIdx(0);
      setFigureSlideIdx(0);
      setConfirmIncompleteAdvance(false);
      setActivePanel('LESSON');
      onClearRequestedLesson?.();
    }
  }, [requestedLessonNumber, onClearRequestedLesson]);

  const activeLesson = lessons.find(w => w.weekNumber === selectedLessonNum) || lessons[0];
  const lessonsInCurrentPhase = lessons.filter(w => w.phase === activeLesson.phase);

  const isLessonFullyCompleted = React.useCallback(
    (lesson: WorkbookWeek) => {
      const tasksDone = lesson.tasks.every(
        (_, idx) => student.tasksCompleted[`${lesson.weekNumber}-${idx}`]
      );
      const fieldsDone = lesson.fields.every(
        f => (student.worksheetAnswers[f.id] || '').trim().length > 0
      );
      return tasksDone && fieldsDone;
    },
    [student.tasksCompleted, student.worksheetAnswers]
  );

  // Build Worksheet Slides (strictly max 4 inputs visible at once per AGENTS.md Rule 4)
  const worksheetSlides = React.useMemo(() => {
    const rawSections = Array.from(
      new Set(activeLesson.fields.map(f => f.section || 'Worksheet Prompts'))
    );
    const slides: { title: string; fields: typeof activeLesson.fields }[] = [];

    rawSections.forEach(secName => {
      const secFields = activeLesson.fields.filter(
        f => (f.section || 'Worksheet Prompts') === secName
      );
      const chunkSize = 4;
      if (secFields.length <= chunkSize) {
        slides.push({ title: secName, fields: secFields });
      } else {
        const totalParts = Math.ceil(secFields.length / chunkSize);
        for (let i = 0; i < secFields.length; i += chunkSize) {
          const partNum = Math.floor(i / chunkSize) + 1;
          slides.push({
            title: `${secName} · Part ${partNum}/${totalParts}`,
            fields: secFields.slice(i, i + chunkSize)
          });
        }
      }
    });

    return slides.length > 0
      ? slides
      : [{ title: 'Worksheet Prompts', fields: activeLesson.fields.slice(0, 4) }];
  }, [activeLesson.fields]);

  const safeSlideIdx = Math.min(worksheetSlideIdx, Math.max(0, worksheetSlides.length - 1));
  const currentWorksheetSlide = worksheetSlides[safeSlideIdx] || worksheetSlides[0];

  const refFigures = activeLesson.referenceFigures || [];
  const safeFigureIdx = Math.min(figureSlideIdx, Math.max(0, refFigures.length - 1));
  const currentFigure = refFigures[safeFigureIdx];

  // Draft state for editing a lesson
  const [draftLesson, setDraftLesson] = useState<WorkbookWeek>(activeLesson);

  const openEditor = () => {
    setDraftLesson(JSON.parse(JSON.stringify(activeLesson)));
    setConfirmResetCurriculum(false);
    setShowEditModal(true);
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLesson(activeLesson.weekNumber, draftLesson);
    setShowEditModal(false);
  };

  const lessonTasksDoneCount = activeLesson.tasks.filter(
    (_, idx) => student.tasksCompleted[`${activeLesson.weekNumber}-${idx}`]
  ).length;
  const lessonFieldsFilledCount = activeLesson.fields.filter(
    f => (student.worksheetAnswers[f.id] || '').trim().length > 0
  ).length;

  const selectLesson = (num: number) => {
    setSelectedLessonNum(num);
    setWorksheetSlideIdx(0);
    setFigureSlideIdx(0);
    setConfirmIncompleteAdvance(false);
    setActivePanel('LESSON');
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Desktop Top Phase Strip + Optional Admin Edit Button (Hidden on Mobile to prevent 5-layer toolbar stacking) */}
      <div className="hidden lg:flex items-center justify-between gap-2">
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-0.5">
          {PHASES.map(p => {
            const isSelectedPhase = activeLesson.phase === p.num;
            const firstLesson = lessons.find(w => w.phase === p.num)?.weekNumber || 1;
            const gateState = student.gateStatus?.[p.num] || (p.num === 1 ? 'OPEN' : 'LOCKED');
            return (
              <button
                key={p.num}
                type="button"
                onClick={() => selectLesson(firstLesson)}
                className={`px-3.5 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] ${
                  isSelectedPhase
                    ? 'bg-[#09ADEF] text-white border-[#09ADEF] shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                    : 'bg-[#07090D] border-white/[0.08] text-neutral-400 hover:text-white'
                }`}
              >
                <span>Phase {p.num}: {p.name}</span>
                {gateState === 'APPROVED' && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px]">
                    ✓
                  </span>
                )}
                {gateState === 'SUBMITTED' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px]">
                    ⏳ Gate
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isCoachMode && (
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-[11px] font-bold uppercase tracking-wider text-[#09ADEF] transition-colors cursor-pointer shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Lesson</span>
          </button>
        )}
      </div>

      {/* Main Split Layout: Left Lessons Menu (Desktop) + Right Lesson Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 3 Columns: Clean Lesson Menu for Active Phase (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-3 glass-panel rounded-2xl p-3.5 space-y-2.5">
          <div className="space-y-1">
            {lessonsInCurrentPhase.map(lesson => {
              const isSelected = lesson.weekNumber === selectedLessonNum;
              const allDone = isLessonFullyCompleted(lesson);
              return (
                <button
                  key={lesson.weekNumber}
                  type="button"
                  onClick={() => selectLesson(lesson.weekNumber)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#09ADEF]/12 border-[#09ADEF] text-white'
                      : 'bg-[#040507] border-transparent hover:bg-white/[0.04] text-neutral-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF]">
                        LESSON {String(lesson.weekNumber).padStart(2, '0')}
                      </span>
                      {lesson.isPhaseGate && (
                        <span className="badge-2mm px-1.5 py-0.5 rounded-full text-[9px]">
                          GATE
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-white mt-0.5 line-clamp-1">
                      {lesson.title}
                    </div>
                  </div>
                  {allDone && (
                    <span className="w-4 h-4 rounded-full bg-[#09ADEF]/20 text-[#09ADEF] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* All 26 Lessons Quick Dropdown */}
          <div className="pt-2.5 border-t border-white/[0.07]">
            <select
              value={selectedLessonNum}
              onChange={e => selectLesson(Number(e.target.value))}
              aria-label="Jump to lesson"
              className="w-full rounded-lg bg-[#040507] border border-white/12 px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#09ADEF]"
            >
              {lessons.map(l => (
                <option key={l.weekNumber} value={l.weekNumber}>
                  Lesson {String(l.weekNumber).padStart(2, '0')}: {l.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right 9 Columns: Active Lesson */}
        <div className="lg:col-span-9 space-y-3 sm:space-y-4">
          {/* Unified Lesson Header & 3-Tab Switcher */}
          <div className="glass-panel rounded-2xl p-4 sm:p-7">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setShowLessonDrawer(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#09ADEF]/12 border border-[#09ADEF]/30 text-[10px] font-bold uppercase tracking-[0.14em] text-[#09ADEF] hover:bg-[#09ADEF]/20 transition cursor-pointer"
                title="Tap to view all 5 Phases & 26 Lessons"
              >
                <span>
                  LESSON {String(activeLesson.weekNumber).padStart(2, '0')}/26 · PHASE 0{activeLesson.phase}
                </span>
                {activeLesson.isPhaseGate && (
                  <span className="px-1.5 py-0.2 rounded bg-[#09ADEF] text-white text-[8px]">
                    GATE
                  </span>
                )}
                <span>▾</span>
              </button>

              <div className="flex items-center gap-1">
                {isCoachMode && (
                  <button
                    type="button"
                    onClick={openEditor}
                    className="lg:hidden p-1.5 rounded-lg bg-[#0A0C10] border border-white/10 text-[#09ADEF] cursor-pointer"
                    title="Edit Lesson"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedLessonNum <= 1}
                  onClick={() => selectLesson(Math.max(1, selectedLessonNum - 1))}
                  className="p-1.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-neutral-300 disabled:opacity-30 cursor-pointer"
                  title="Previous Lesson"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={selectedLessonNum >= 26}
                  onClick={() => selectLesson(Math.min(26, selectedLessonNum + 1))}
                  className="p-1.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-neutral-300 disabled:opacity-30 cursor-pointer"
                  title="Next Lesson"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl text-white tracking-wide leading-tight">
              {activeLesson.title}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">{activeLesson.subtitle}</p>

            {/* Clean Single-Row 3-Tab Switcher */}
            <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3.5 border-t border-white/[0.07]">
              <button
                type="button"
                onClick={() => setActivePanel('LESSON')}
                className={`py-2 px-2 sm:px-3 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] ${
                  activePanel === 'LESSON'
                    ? 'bg-[#09ADEF] text-white border-[#09ADEF] shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                    : 'bg-[#07090D] border-white/[0.07] text-neutral-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Lesson ({lessonTasksDoneCount}/{activeLesson.tasks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel('WORKSHEET')}
                className={`py-2 px-2 sm:px-3 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] ${
                  activePanel === 'WORKSHEET'
                    ? 'bg-[#09ADEF] text-white border-[#09ADEF] shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                    : 'bg-[#07090D] border-white/[0.07] text-neutral-400 hover:text-white'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Sheet ({lessonFieldsFilledCount}/{activeLesson.fields.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePanel('RUBRIC')}
                className={`py-2 px-2 sm:px-3 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] ${
                  activePanel === 'RUBRIC'
                    ? 'bg-[#09ADEF] text-white border-[#09ADEF] shadow-[0_4px_20px_rgba(9,173,239,0.35)]'
                    : 'bg-[#07090D] border-white/[0.07] text-neutral-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Gate Check</span>
              </button>
            </div>
          </div>

          {/* SEQUENTIAL PANEL 1: THE LESSON, 1-PANEL REFERENCE FIGURE SLIDER & ACTION CHECKLIST */}
          {activePanel === 'LESSON' && (
            <div className="glass-panel rounded-2xl p-5 sm:p-7 space-y-5 sm:space-y-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                  PART 1 · CORE LESSON PRINCIPLES
                </span>
                <ul className="space-y-2.5 mt-3">
                  {activeLesson.lessonBullets.map((b, idx) => (
                    <li
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-xl bg-[#040507] border border-white/[0.07] text-xs sm:text-sm text-neutral-200 flex items-start gap-3 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#09ADEF]/15 text-[#09ADEF] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 1-Panel Reference Figure Slider when figures exist */}
              {refFigures.length > 0 && currentFigure && (
                <div className="pt-4 border-t border-white/[0.07] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                      WORKBOOK REFERENCE FIGURE ({safeFigureIdx + 1} OF {refFigures.length})
                    </span>

                    {refFigures.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safeFigureIdx === 0}
                          onClick={() => setFigureSlideIdx(i => Math.max(0, i - 1))}
                          className="p-1.5 rounded-lg bg-[#0A0C10] border border-white/10 text-neutral-300 disabled:opacity-30 cursor-pointer"
                          title="Previous Figure"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {refFigures.map((f, fIdx) => (
                          <button
                            key={`${f.figNumber}-${fIdx}`}
                            type="button"
                            onClick={() => setFigureSlideIdx(fIdx)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                              fIdx === safeFigureIdx
                                ? 'bg-[#09ADEF] text-white'
                                : 'bg-[#07090D] border border-white/10 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {f.figNumber}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={safeFigureIdx >= refFigures.length - 1}
                          onClick={() => setFigureSlideIdx(i => Math.min(refFigures.length - 1, i + 1))}
                          className="p-1.5 rounded-lg bg-[#0A0C10] border border-white/10 text-neutral-300 disabled:opacity-30 cursor-pointer"
                          title="Next Figure"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Single Active Reference Figure Card */}
                  <div className="rounded-xl bg-[#040507] border border-white/[0.08] p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="badge-2mm px-2.5 py-0.5 rounded-full text-[10px]">
                          {currentFigure.figNumber}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-white">{currentFigure.title}</h4>
                      </div>
                      {currentFigure.caption && (
                        <span className="text-xs text-neutral-400">{currentFigure.caption}</span>
                      )}
                    </div>

                    {currentFigure.cards && currentFigure.cards.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {currentFigure.cards.map((card, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3.5 rounded-xl bg-black border border-white/[0.07] space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-white">{card.title}</span>
                              {card.badge && (
                                <span className="badge-2mm px-2 py-0.5 rounded-full text-[9px]">
                                  {card.badge}
                                </span>
                              )}
                            </div>
                            {card.subtitle && (
                              <div className="text-[11px] font-medium text-[#09ADEF]">{card.subtitle}</div>
                            )}
                            <p className="text-xs text-neutral-300 leading-relaxed">{card.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentFigure.headers && currentFigure.rows && (
                      <div className="overflow-x-auto rounded-xl border border-white/8">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-white/[0.04] border-b border-white/10 text-neutral-300">
                              {currentFigure.headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-3 font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/8">
                            {currentFigure.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-white/[0.02]">
                                {row.map((cell, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className={`p-3 leading-relaxed ${
                                      cellIdx === 0 ? 'font-semibold text-white' : 'text-neutral-300'
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
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/[0.07]">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF] block mb-3">
                  PART 2 · DO THE WORK (ACTION CHECKLIST)
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
                            ? 'bg-[#09ADEF]/10 border-[#09ADEF]/30 text-neutral-300'
                            : 'bg-[#040507] border-white/[0.07] hover:border-[#09ADEF]/50 text-white'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-[#09ADEF] shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                        )}
                        <span className={`text-xs sm:text-sm leading-relaxed ${isChecked ? 'line-through text-neutral-400' : ''}`}>
                          {taskText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coaching Prompt & Failure Trap Callout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-white/[0.07]">
                <div className="p-4 rounded-xl bg-[#040507] border-l-2 border-[#09ADEF] space-y-1">
                  <div className="text-[10px] font-bold text-[#09ADEF] uppercase tracking-[0.16em]">
                    THE SHIFT · COACHING PROMPT
                  </div>
                  <p className="text-xs sm:text-sm italic text-neutral-200 leading-relaxed">
                    “{activeLesson.coachingPrompt}”
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#040507] border border-rose-500/20 space-y-1">
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.16em] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> WHERE IT FAILS
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">{activeLesson.whereItFails}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.07] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetSlideIdx(0);
                    setActivePanel('WORKSHEET');
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg btn-2mm text-xs cursor-pointer"
                >
                  <span>Open Lesson {activeLesson.weekNumber} Worksheet</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SEQUENTIAL PANEL 2: WORKSHEET SLIDER OR 1-PAGE VIEW */}
          {activePanel === 'WORKSHEET' && currentWorksheetSlide && (
            <div className="glass-panel rounded-2xl p-5 sm:p-7 space-y-5">
              {/* Top Header */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-white/[0.07]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF]">
                      LESSON {activeLesson.weekNumber} WORKSHEET · {lessonFieldsFilledCount}/{activeLesson.fields.length} FIELDS COMPLETED
                    </span>
                    {[10, 11, 12, 13].includes(activeLesson.weekNumber) && (
                      <span className="px-2 py-0.5 rounded bg-[#09ADEF]/10 border border-[#09ADEF]/30 text-[10px] font-semibold text-[#09ADEF]">
                        ⇄ Two-Way Synced with Core Video B{activeLesson.weekNumber - 9} in Video Studio
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl text-white mt-0.5 tracking-wide">
                    {activeLesson.moduleTitle}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeLesson.weekNumber === 21 && onSyncShiftMagnetFromLesson21 && (
                    <button
                      type="button"
                      onClick={() => {
                        onSyncShiftMagnetFromLesson21();
                        setMagnetSyncSaved(true);
                        setTimeout(() => setMagnetSyncSaved(false), 3500);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <Magnet className="w-3 h-3" />
                      <span>
                        {magnetSyncSaved
                          ? '✓ Synced to Studio CTA!'
                          : 'Sync to Shift Magnets & Studio CTA'}
                      </span>
                    </button>
                  )}

                  {activeLesson.workedExample && (
                    <button
                      type="button"
                      onClick={() => setShowWorkedExample(v => !v)}
                      className="badge-2mm px-3 py-1.5 rounded-full text-[10px] cursor-pointer"
                    >
                      {showWorkedExample ? 'Hide Example' : 'Worked Example'}
                    </button>
                  )}
                </div>
              </div>

              {activeLesson.workedExample && showWorkedExample && (
                <div className="p-4 rounded-xl bg-[#040507] border border-[#09ADEF]/25 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#09ADEF]">
                    <span>◆ Worked Example · {activeLesson.workedExample.title}</span>
                    <span className="text-neutral-400">{activeLesson.workedExample.company}</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {activeLesson.workedExample.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-0.5 sm:gap-1 text-xs">
                        <span className="sm:col-span-4 font-semibold text-neutral-400">{item.label}</span>
                        <span className="sm:col-span-8 text-neutral-200">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Foundation & Story Bank Reference Bar for Scripting & VSL Lessons (8, 10–18) */}
              {[8, 10, 11, 12, 13, 14, 15, 16, 17, 18].includes(activeLesson.weekNumber) && (
                <details className="group rounded-xl bg-[#040507] border border-white/[0.08] p-3.5">
                  <summary className="text-xs font-semibold text-neutral-200 cursor-pointer flex items-center justify-between list-none">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#09ADEF]" />
                      <span>
                        Your Foundation Messaging & Top 8 Story Bank Reference (Lessons 2–6)
                      </span>
                    </span>
                    <span className="text-[#09ADEF] text-[11px] group-open:rotate-90 transition-transform">▸</span>
                  </summary>
                  <div className="mt-3 pt-3 border-t border-white/[0.07] space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <div className="p-2.5 rounded-lg bg-black border border-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                          Q1 · Core Transformation
                        </div>
                        <p className="text-neutral-200 mt-1 leading-relaxed">
                          {student.worksheetAnswers['m02_q1_transformation'] ||
                            'Not yet filled in Lesson 2'}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black border border-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                          Q4 · Core Belief Statement
                        </div>
                        <p className="text-neutral-200 mt-1 leading-relaxed">
                          {student.worksheetAnswers['m02_q4_belief'] ||
                            'Not yet filled in Lesson 2'}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black border border-white/10">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                          Q7 · Unique Mechanism & Proof
                        </div>
                        <p className="text-neutral-200 mt-1 leading-relaxed">
                          {student.worksheetAnswers['m02_q7_mechanism'] ||
                            student.worksheetAnswers['m03_proof'] ||
                            'Not yet filled in Lesson 4'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                        Top 8 Story Bank (Lesson 6):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {[
                          {
                            num: 1,
                            title: student.worksheetAnswers['m05_title'],
                            snippet:
                              student.worksheetAnswers['m05_20s'] ||
                              student.worksheetAnswers['m05_90s']
                          },
                          ...[2, 3, 4, 5, 6, 7, 8].map(n => ({
                            num: n,
                            title: student.worksheetAnswers[`m05_s${n}_header`],
                            snippet: student.worksheetAnswers[`m05_s${n}_lengths`]
                          }))
                        ].map(st => (
                          <div
                            key={st.num}
                            className="p-2 rounded-lg bg-black border border-white/10 text-[11px]"
                          >
                            <div className="font-semibold text-white truncate">
                              #{st.num}: {st.title || 'Untitled Story'}
                            </div>
                            {st.snippet && (
                              <div className="text-neutral-400 line-clamp-2 mt-0.5">
                                {st.snippet}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
              )}

              {/* 1-Panel Slider Controls when there are multiple worksheet panels */}
              {worksheetSlides.length > 1 && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#040507] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#09ADEF] block">
                        PANEL {safeSlideIdx + 1} OF {worksheetSlides.length}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5">
                        {currentWorksheetSlide.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={safeSlideIdx === 0}
                        onClick={() => setWorksheetSlideIdx(i => Math.max(0, i - 1))}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/12 text-xs font-semibold text-white disabled:opacity-30 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </button>
                      <button
                        type="button"
                        disabled={safeSlideIdx >= worksheetSlides.length - 1}
                        onClick={() => setWorksheetSlideIdx(i => Math.min(worksheetSlides.length - 1, i + 1))}
                        className="px-2.5 py-1.5 rounded-lg bg-[#09ADEF] hover:bg-[#09B3F8] text-xs font-bold uppercase tracking-wider text-white disabled:opacity-30 cursor-pointer flex items-center gap-1"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive Range Slider + Step Pills */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={worksheetSlides.length - 1}
                      value={safeSlideIdx}
                      onChange={e => setWorksheetSlideIdx(Number(e.target.value))}
                      aria-label="Slide between worksheet panels"
                      className="w-full accent-[#09ADEF] cursor-pointer h-1.5 bg-white/10 rounded-lg"
                    />

                    <div className="flex overflow-x-auto no-scrollbar gap-1.5 pt-0.5">
                      {worksheetSlides.map((slide, sIdx) => {
                        const slideDoneCount = slide.fields.filter(
                          f => (student.worksheetAnswers[f.id] || '').trim().length > 0
                        ).length;
                        const isSlideComplete = slideDoneCount === slide.fields.length && slide.fields.length > 0;
                        const isCurrent = sIdx === safeSlideIdx;
                        return (
                          <button
                            key={slide.title}
                            type="button"
                            onClick={() => setWorksheetSlideIdx(sIdx)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                              isCurrent
                                ? 'bg-[#09ADEF] text-white shadow-[0_2px_12px_rgba(9,173,239,0.35)]'
                                : isSlideComplete
                                ? 'bg-[#09ADEF]/15 border border-[#09ADEF]/35 text-[#09ADEF]'
                                : 'bg-[#0A0C10] border border-white/10 text-neutral-400 hover:text-white'
                            }`}
                          >
                            <span>Panel {sIdx + 1}</span>
                            {isSlideComplete && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVE WORKSHEET PANEL */}
              <div className="p-4 sm:p-6 rounded-2xl bg-[#040507] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                    {currentWorksheetSlide.title}
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    {
                      currentWorksheetSlide.fields.filter(
                        f => (student.worksheetAnswers[f.id] || '').trim().length > 0
                      ).length
                    }{' '}
                    of {currentWorksheetSlide.fields.length} completed
                  </span>
                </div>

                <div className="space-y-4">
                  {currentWorksheetSlide.fields.map(field => {
                    const val = student.worksheetAnswers[field.id] || '';
                    // Detect Lessons 14-17 Expert Demo script fields (l14_v01_script .. l17_v20_script) and link to Lesson 7 Matrix cell
                    const demoMatch = field.id.match(/^l1[4-7]_v(\d{2})_script$/);
                    const matrixCellNum = demoMatch ? demoMatch[1] : null;
                    const linkedMatrixTitle = matrixCellNum
                      ? student.worksheetAnswers[`m06_cell_${matrixCellNum}`]?.trim()
                      : null;
                    const topicIndex = matrixCellNum ? Math.ceil(Number(matrixCellNum) / 4) : null;
                    const linkedTopicName = topicIndex
                      ? student.worksheetAnswers[`m06_topic${topicIndex}`]?.trim()
                      : null;

                    return (
                      <div key={field.id} className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label htmlFor={field.id} className="block text-xs font-semibold text-neutral-200">
                            {field.label}
                          </label>
                          {matrixCellNum && (
                            <div className="flex flex-wrap items-center gap-2">
                              {linkedMatrixTitle ? (
                                <span className="px-2 py-0.5 rounded bg-[#09ADEF]/10 border border-[#09ADEF]/30 text-[10px] font-medium text-[#09ADEF]">
                                  Lesson 7 Title: “{linkedMatrixTitle}”
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-500">
                                  (Lesson 7 Cell #{matrixCellNum} not yet titled)
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const headerLine = linkedMatrixTitle
                                    ? `WORKING TITLE: ${linkedMatrixTitle}${linkedTopicName ? ` (${linkedTopicName})` : ''}`
                                    : `DEMO VIDEO #${matrixCellNum}`;
                                  const bulletTemplate = `• S (Signal Hook): \n• H (Humanize + Keyword): \n• I (Illuminate Old Belief): \n• F (Formulate 2mm Shift): \n• T (Transfer CTA): \n• Published URL: `;
                                  const trimmedVal = val.trim();
                                  if (!trimmedVal) {
                                    onUpdateField(field.id, `${headerLine}\n${bulletTemplate}`);
                                    return;
                                  }
                                  const withoutOldHeader = trimmedVal.replace(/^(WORKING TITLE:.*|DEMO VIDEO #\d+)\n?/i, '').trim();
                                  const hasBullets = withoutOldHeader.includes('• S (Signal Hook):');
                                  onUpdateField(
                                    field.id,
                                    hasBullets
                                      ? `${headerLine}\n${withoutOldHeader}`
                                      : `${headerLine}\n${withoutOldHeader}\n${bulletTemplate}`
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-[#09ADEF]/20 border border-white/15 hover:border-[#09ADEF]/40 text-[10px] font-bold uppercase tracking-wider text-white cursor-pointer transition"
                              >
                                + Insert S.H.I.F.T. Template
                              </button>
                            </div>
                          )}
                        </div>
                        {field.multiline ? (
                          <textarea
                            id={field.id}
                            rows={3}
                            value={val}
                            onChange={e => onUpdateField(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full rounded-lg bg-black border border-white/12 focus:border-[#09ADEF] p-3.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none leading-relaxed"
                          />
                        ) : (
                          <input
                            id={field.id}
                            type="text"
                            value={val}
                            onChange={e => onUpdateField(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full rounded-lg bg-black border border-white/12 focus:border-[#09ADEF] p-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Slider Navigation Bar */}
              <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between gap-2">
                {safeSlideIdx > 0 ? (
                  <button
                    type="button"
                    onClick={() => setWorksheetSlideIdx(i => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-neutral-200 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev Panel ({safeSlideIdx} of {worksheetSlides.length})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActivePanel('LESSON')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#0A0C10] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-neutral-300 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Lesson</span>
                  </button>
                )}

                {safeSlideIdx < worksheetSlides.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setWorksheetSlideIdx(i => Math.min(worksheetSlides.length - 1, i + 1))}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg btn-2mm text-xs cursor-pointer"
                  >
                    <span>Next Panel ({safeSlideIdx + 2} of {worksheetSlides.length})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActivePanel('RUBRIC')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg btn-2mm text-xs cursor-pointer"
                  >
                    <span>Next: Gate Check</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
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

              {activeLesson.isPhaseGate && (
                <div
                  className={`p-4 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                    student.gateStatus?.[activeLesson.phase] === 'APPROVED'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : student.gateStatus?.[activeLesson.phase] === 'SUBMITTED'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-[#09ADEF]/10 border-[#09ADEF]/30 text-neutral-200'
                  }`}
                >
                  <div>
                    <span className="font-bold uppercase tracking-wider block">
                      {student.gateStatus?.[activeLesson.phase] === 'APPROVED'
                        ? `✓ Phase 0${activeLesson.phase} Gate Approved by Coach Josh`
                        : student.gateStatus?.[activeLesson.phase] === 'SUBMITTED'
                        ? `⏳ Phase 0${activeLesson.phase} Gate Submitted — Pending Coach Sign-Off`
                        : `◆ Phase 0${activeLesson.phase} Gate Milestone`}
                    </span>
                    <span className="text-neutral-300 mt-0.5 block">
                      {student.gateStatus?.[activeLesson.phase] === 'APPROVED'
                        ? 'Your deliverables & rubric for this phase have been verified and signed off.'
                        : student.gateStatus?.[activeLesson.phase] === 'SUBMITTED'
                        ? 'Coach Josh has been notified in your chat inbox. You may continue to the next lesson while awaiting sign-off.'
                        : 'Complete your worksheet fields and self-score the rubric above, then submit for Coach sign-off.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Readiness Warning when Worksheet fields are incomplete */}
              {confirmIncompleteAdvance && lessonFieldsFilledCount < activeLesson.fields.length && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold uppercase tracking-wider text-amber-300">
                        Worksheet Incomplete ({lessonFieldsFilledCount} of {activeLesson.fields.length} fields filled)
                      </div>
                      <p className="text-neutral-200 mt-0.5">
                        You still have blank worksheet prompts in Lesson {activeLesson.weekNumber}. Click the button again to advance anyway, or return to the Worksheet to finish.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmIncompleteAdvance(false);
                      setActivePanel('WORKSHEET');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                  >
                    Fill Worksheet
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-white/8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActivePanel('WORKSHEET')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Worksheet
                </button>

                {activeLesson.isPhaseGate ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        lessonFieldsFilledCount < activeLesson.fields.length &&
                        !confirmIncompleteAdvance
                      ) {
                        setConfirmIncompleteAdvance(true);
                        return;
                      }
                      setConfirmIncompleteAdvance(false);
                      const nextNum = Math.min(26, activeLesson.weekNumber + 1);
                      onSubmitPhaseGate(activeLesson.phase, nextNum);
                      setSelectedLessonNum(nextNum);
                      setActivePanel('LESSON');
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <span>
                      {confirmIncompleteAdvance
                        ? `Confirm & Submit Phase 0${activeLesson.phase} Gate Anyway`
                        : student.gateStatus?.[activeLesson.phase] === 'SUBMITTED' ||
                          student.gateStatus?.[activeLesson.phase] === 'APPROVED'
                        ? `◆ Resubmit Phase 0${activeLesson.phase} Gate & Open Lesson ${Math.min(26, activeLesson.weekNumber + 1)}`
                        : `◆ Submit Phase 0${activeLesson.phase} Gate for Coach Sign-Off`}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        lessonFieldsFilledCount < activeLesson.fields.length &&
                        !confirmIncompleteAdvance
                      ) {
                        setConfirmIncompleteAdvance(true);
                        return;
                      }
                      setConfirmIncompleteAdvance(false);
                      if (activeLesson.weekNumber === 21 && onSyncShiftMagnetFromLesson21) {
                        onSyncShiftMagnetFromLesson21();
                      }
                      const nextNum = Math.min(26, activeLesson.weekNumber + 1);
                      onCompleteLesson?.(activeLesson.weekNumber, nextNum);
                      setSelectedLessonNum(nextNum);
                      setActivePanel('LESSON');
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <span>
                      {confirmIncompleteAdvance
                        ? `Confirm & Advance to Lesson ${Math.min(26, activeLesson.weekNumber + 1)} Anyway`
                        : `Complete Lesson ${activeLesson.weekNumber} & Advance to Lesson ${Math.min(26, activeLesson.weekNumber + 1)}`}
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
            {confirmResetCurriculum ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetLessonsToDefault();
                    setConfirmResetCurriculum(false);
                    setShowEditModal(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Confirm Reset All 26 Lessons
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetCurriculum(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetCurriculum(true)}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset All 26 Lessons to Default
              </button>
            )}

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

      {/* Unified Mobile/Desktop Curriculum Lesson & Phase Picker Sheet */}
      <ModalDialog
        isOpen={showLessonDrawer}
        onClose={() => setShowLessonDrawer(false)}
        title="26-Lesson Curriculum Roadmap"
        subtitle={`Currently viewing Lesson ${String(selectedLessonNum).padStart(2, '0')} · Assigned Lesson ${String(student.currentWeek).padStart(2, '0')}`}
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {PHASES.map(p => {
            const phaseLessons = lessons.filter(l => l.phase === p.num);
            const phaseDone = phaseLessons.filter(l => isLessonFullyCompleted(l)).length;
            const gateState = student.gateStatus?.[p.num] || (p.num === 1 ? 'OPEN' : 'LOCKED');

            return (
              <div
                key={p.num}
                className="rounded-2xl bg-[#040507] border border-white/10 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#09ADEF]">
                      PHASE 0{p.num} · {p.name} ({p.desc})
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {phaseDone}/{phaseLessons.length} Lessons Completed · {p.range}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      gateState === 'APPROVED'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : gateState === 'SUBMITTED'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-white/5 text-neutral-400 border border-white/10'
                    }`}
                  >
                    Gate: {gateState}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {phaseLessons.map(lesson => {
                    const isSelected = lesson.weekNumber === selectedLessonNum;
                    const isCompleted = isLessonFullyCompleted(lesson);
                    const isAssigned = lesson.weekNumber === student.currentWeek;

                    return (
                      <button
                        key={lesson.weekNumber}
                        type="button"
                        onClick={() => {
                          selectLesson(lesson.weekNumber);
                          setShowLessonDrawer(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#09ADEF]/15 border-[#09ADEF] text-white'
                            : isCompleted
                            ? 'bg-white/[0.02] border-emerald-500/25 text-slate-200 hover:border-white/20'
                            : 'bg-black/40 border-white/[0.06] text-slate-300 hover:border-white/15'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#09ADEF]">
                              Lesson {String(lesson.weekNumber).padStart(2, '0')}
                            </span>
                            {isAssigned && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9px] font-bold uppercase">
                                Current
                              </span>
                            )}
                            {lesson.isPhaseGate && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                                ◆ Gate
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-medium text-white truncate mt-0.5">
                            {lesson.title}
                          </div>
                        </div>
                        {isCompleted ? (
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ModalDialog>
    </div>
  );
};
