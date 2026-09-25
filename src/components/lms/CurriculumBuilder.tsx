/**
 * BismiLLAH — CurriculumBuilder (2026-09-25): the missing course-authoring UI.
 * Lets an entity create/reorder/delete modules, lessons (text / video / quiz)
 * and quiz questions, persisting through the existing LMSService + db helpers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Course,
  CourseModule,
  Lesson,
  LMSService,
  ModuleType,
  QuizQuestion,
} from '../../lib/lms';
import { githubDB as dbHelpers, collections } from '../../lib/database';
import { useToastService } from '../../lib/toast-service';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  Video,
  ListChecks,
  Save,
  X,
} from 'lucide-react';

interface CurriculumBuilderProps {
  course: Course;
  onChanged?: () => void;
}

interface LessonDraft {
  id?: string;
  title: string;
  type: ModuleType;
  estimated_duration: number;
  is_preview: boolean;
  text_content: string;
  video_url: string;
  questions: QuizQuestion[];
  passing_score: number;
}

const EMPTY_LESSON: LessonDraft = {
  title: '',
  type: ModuleType.TEXT,
  estimated_duration: 10,
  is_preview: false,
  text_content: '',
  video_url: '',
  questions: [],
  passing_score: 70,
};

const typeIcon = (t: ModuleType) =>
  t === ModuleType.VIDEO ? (
    <Video className="w-4 h-4 text-[var(--green-600)]" />
  ) : t === ModuleType.QUIZ ? (
    <ListChecks className="w-4 h-4 text-[var(--gold-600)]" />
  ) : (
    <FileText className="w-4 h-4 text-[var(--green-600)]" />
  );

const CurriculumBuilder: React.FC<CurriculumBuilderProps> = ({ course, onChanged }) => {
  const toast = useToastService();
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [busy, setBusy] = useState(false);

  // Lesson editor state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      try {
        setLoading(true);
        const fresh = await LMSService.getCourse(course.id);
        setModules(fresh?.modules ?? []);
      } catch {
        setModules(course.modules ?? []);
      } finally {
        setLoading(false);
      }
    },
    [course.id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddModule = async () => {
    const title = newModuleTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      await LMSService.addModule(course.id, {
        title,
        description: '',
        order: modules.length,
        is_locked: false,
      });
      setNewModuleTitle('');
      await load();
      onChanged?.();
      toast.showInfo('Module added');
    } catch {
      toast.showInfo('Failed to add module');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (busy) return;
    if (!window.confirm('Delete this module and all its lessons?')) return;
    setBusy(true);
    try {
      const lessons = await dbHelpers.find<Lesson>(collections.course_lessons, { module_id: moduleId });
      for (const l of lessons) await dbHelpers.delete(collections.course_lessons, l.id);
      await dbHelpers.delete(collections.course_modules, moduleId);
      await load();
      onChanged?.();
      toast.showInfo('Module deleted');
    } finally {
      setBusy(false);
    }
  };

  const moveModule = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= modules.length || busy) return;
    const next = [...modules];
    const [m] = next.splice(index, 1);
    next.splice(target, 0, m);
    setModules(next);
    setBusy(true);
    try {
      await Promise.all(next.map((mod, i) => dbHelpers.update(collections.course_modules, mod.id, { order: i })));
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const openNewLesson = (moduleId: string) => {
    setEditingModuleId(moduleId);
    setEditingLessonId(null);
    setLessonDraft({ ...EMPTY_LESSON });
  };

  const openExistingLesson = (moduleId: string, lesson: Lesson) => {
    setEditingModuleId(moduleId);
    setEditingLessonId(lesson.id);
    setLessonDraft({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      estimated_duration: lesson.estimated_duration ?? 10,
      is_preview: !!lesson.is_preview,
      text_content: lesson.content?.text_content ?? '',
      video_url: lesson.content?.video_url ?? '',
      questions:
        (lesson.content?.quiz_data?.questions as QuizQuestion[]) ??
        ((lesson as unknown as { questions?: QuizQuestion[] }).questions ?? []),
      passing_score: lesson.content?.quiz_data?.passing_score ?? 70,
    });
  };

  const handleSaveLesson = async () => {
    if (!lessonDraft || !editingModuleId || busy) return;
    if (!lessonDraft.title.trim()) {
      toast.showInfo('Lesson needs a title');
      return;
    }
    setBusy(true);
    try {
      const mod = modules.find((m) => m.id === editingModuleId);
      const payload: Partial<Lesson> = {
        title: lessonDraft.title.trim(),
        type: lessonDraft.type,
        order: lessonDraft.id ? undefined : (mod?.lessons?.length ?? 0),
        estimated_duration: Number(lessonDraft.estimated_duration) || 10,
        is_preview: lessonDraft.is_preview,
        content: {
          text_content: lessonDraft.type === ModuleType.QUIZ ? '' : lessonDraft.text_content,
          video_url: lessonDraft.type === ModuleType.VIDEO ? lessonDraft.video_url : undefined,
          quiz_data:
            lessonDraft.type === ModuleType.QUIZ
              ? {
                  questions: lessonDraft.questions,
                  passing_score: lessonDraft.passing_score,
                  attempts_allowed: 3,
                  randomize_questions: false,
                  show_correct_answers: true,
                }
              : undefined,
        },
      };
      if (lessonDraft.id) {
        await dbHelpers.update(collections.course_lessons, lessonDraft.id, payload);
      } else {
        await LMSService.addLesson(editingModuleId, payload);
      }
      setLessonDraft(null);
      setEditingModuleId(null);
      setEditingLessonId(null);
      await load();
      onChanged?.();
      toast.showInfo('Lesson saved');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (busy) return;
    if (!window.confirm('Delete this lesson?')) return;
    setBusy(true);
    try {
      await dbHelpers.delete(collections.course_lessons, lessonId);
      await load();
      onChanged?.();
      toast.showInfo('Lesson deleted');
    } finally {
      setBusy(false);
    }
  };

  const moveLesson = async (moduleId: string, index: number, dir: -1 | 1) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || busy) return;
    const target = index + dir;
    if (target < 0 || target >= (mod.lessons?.length ?? 0)) return;
    const next = [...(mod.lessons ?? [])];
    const [l] = next.splice(index, 1);
    next.splice(target, 0, l);
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons: next } : m)),
    );
    setBusy(true);
    try {
      await Promise.all(next.map((ls, i) => dbHelpers.update(collections.course_lessons, ls.id, { order: i })));
    } finally {
      setBusy(false);
    }
  };

  // ---- Quiz question editing helpers ----
  const addQuestion = () => {
    if (!lessonDraft) return;
    setLessonDraft({
      ...lessonDraft,
      questions: [
        ...lessonDraft.questions,
        {
          id: `q_${Date.now().toString(36)}`,
          type: 'multiple_choice',
          question: '',
          options: ['', '', '', ''],
          correct_answer: '',
          points: 1,
        },
      ],
    });
  };

  const updateQuestion = (idx: number, patch: Partial<QuizQuestion>) => {
    if (!lessonDraft) return;
    setLessonDraft({
      ...lessonDraft,
      questions: lessonDraft.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    });
  };

  const removeQuestion = (idx: number) => {
    if (!lessonDraft) return;
    setLessonDraft({ ...lessonDraft, questions: lessonDraft.questions.filter((_, i) => i !== idx) });
  };

  if (loading) {
    return <div className="cc-card p-6 text-[var(--color-text-secondary)] text-sm">Loading curriculum…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Module list */}
      {modules.length === 0 && (
        <div className="cc-card cc-card--tint p-8 text-center">
          <p className="font-medium text-[var(--color-text)]">No modules yet</p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Add your first module below — then fill it with text lessons, videos and quizzes.
          </p>
        </div>
      )}

      {modules.map((mod, mIdx) => (
        <div key={mod.id} className="cc-card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hairline)] bg-[var(--surface-tint)]">
            <div className="flex flex-col">
              <button onClick={() => moveModule(mIdx, -1)} disabled={mIdx === 0} className="p-0.5 disabled:opacity-30" aria-label="Move module up">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={() => moveModule(mIdx, 1)} disabled={mIdx === modules.length - 1} className="p-0.5 disabled:opacity-30" aria-label="Move module down">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-[var(--color-text)] truncate">
                Module {mIdx + 1}: {mod.title}
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {mod.lessons?.length ?? 0} lesson{(mod.lessons?.length ?? 0) === 1 ? '' : 's'}
              </p>
            </div>
            <button onClick={() => openNewLesson(mod.id)} className="cc-btn cc-btn--ghost !py-1.5 !px-3 text-xs">
              <Plus className="w-3.5 h-3.5" /> Lesson
            </button>
            <button onClick={() => handleDeleteModule(mod.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Delete module">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Lessons */}
          <div className="divide-y divide-[var(--hairline)]">
            {(mod.lessons ?? []).map((lesson, lIdx) => (
              <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex flex-col">
                  <button onClick={() => moveLesson(mod.id, lIdx, -1)} disabled={lIdx === 0} className="p-0.5 disabled:opacity-30" aria-label="Move lesson up">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveLesson(mod.id, lIdx, 1)} disabled={lIdx === (mod.lessons?.length ?? 0) - 1} className="p-0.5 disabled:opacity-30" aria-label="Move lesson down">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                {typeIcon(lesson.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">
                    {lIdx + 1}. {lesson.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {lesson.type} · {lesson.estimated_duration ?? 10} min
                    {lesson.is_preview ? ' · free preview' : ''}
                    {lesson.type === ModuleType.QUIZ && lesson.content?.quiz_data?.questions
                      ? ` · ${lesson.content.quiz_data.questions.length} questions`
                      : ''}
                  </p>
                </div>
                <button onClick={() => openExistingLesson(mod.id, lesson)} className="cc-btn cc-btn--ghost !py-1 !px-2.5 text-xs">
                  Edit
                </button>
                <button onClick={() => handleDeleteLesson(lesson.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Delete lesson">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Lesson editor */}
            {editingModuleId === mod.id && lessonDraft && (
              <div className="p-4 bg-[var(--surface-tint)] space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-sm text-[var(--color-text)]">
                    {editingLessonId ? 'Edit lesson' : 'New lesson'}
                  </h5>
                  <button
                    onClick={() => {
                      setLessonDraft(null);
                      setEditingModuleId(null);
                    }}
                    className="p-1.5 hover:bg-[var(--surface-tint)] rounded-lg"
                    aria-label="Close editor"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Title</label>
                    <input
                      value={lessonDraft.title}
                      onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })}
                      className="cc-input"
                      placeholder="Lesson title"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Type</label>
                    <select
                      value={lessonDraft.type}
                      onChange={(e) => setLessonDraft({ ...lessonDraft, type: e.target.value as ModuleType })}
                      className="cc-input"
                    >
                      <option value={ModuleType.TEXT}>Text</option>
                      <option value={ModuleType.VIDEO}>Video</option>
                      <option value={ModuleType.QUIZ}>Quiz</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Duration (min)</label>
                    <input
                      type="number"
                      min={1}
                      value={lessonDraft.estimated_duration}
                      onChange={(e) => setLessonDraft({ ...lessonDraft, estimated_duration: Number(e.target.value) })}
                      className="cc-input"
                    />
                  </div>
                  {lessonDraft.type === ModuleType.VIDEO && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Video URL (mp4)</label>
                      <input
                        value={lessonDraft.video_url}
                        onChange={(e) => setLessonDraft({ ...lessonDraft, video_url: e.target.value })}
                        className="cc-input"
                        placeholder="https://… or /videos/lesson.mp4"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text)] sm:mt-6">
                    <input
                      type="checkbox"
                      checked={lessonDraft.is_preview}
                      onChange={(e) => setLessonDraft({ ...lessonDraft, is_preview: e.target.checked })}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    Free preview
                  </label>
                </div>

                {lessonDraft.type !== ModuleType.QUIZ && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                      Lesson content (HTML allowed: p, h3, ul, li, strong, em, blockquote)
                    </label>
                    <textarea
                      value={lessonDraft.text_content}
                      onChange={(e) => setLessonDraft({ ...lessonDraft, text_content: e.target.value })}
                      rows={8}
                      className="cc-input font-mono text-[13px]"
                      placeholder="<p>Write the lesson here…</p>"
                    />
                  </div>
                )}

                {lessonDraft.type === ModuleType.QUIZ && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                        Questions ({lessonDraft.questions.length})
                      </label>
                      <button onClick={addQuestion} className="cc-btn cc-btn--ghost !py-1.5 !px-3 text-xs">
                        <Plus className="w-3.5 h-3.5" /> Add question
                      </button>
                    </div>

                    {lessonDraft.questions.map((q, qi) => (
                      <div key={q.id} className="cc-card cc-card--flat p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--color-text-secondary)]">Q{qi + 1}</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const t = e.target.value as QuizQuestion['type'];
                                updateQuestion(qi, {
                                  type: t,
                                  options: t === 'multiple_choice' ? q.options ?? ['', '', '', ''] : t === 'true_false' ? ['True', 'False'] : undefined,
                                  correct_answer: t === 'true_false' ? 'True' : '',
                                });
                              }}
                              className="cc-input !py-1 !px-2 text-xs"
                            >
                              <option value="multiple_choice">Multiple choice</option>
                              <option value="true_false">True / False</option>
                              <option value="fill_blank">Fill in the blank</option>
                            </select>
                            <button onClick={() => removeQuestion(qi)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Remove question">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <input
                          value={q.question}
                          onChange={(e) => updateQuestion(qi, { question: e.target.value })}
                          className="cc-input"
                          placeholder="Question text"
                        />
                        {q.type === 'multiple_choice' && (
                          <div className="space-y-2">
                            {(q.options ?? []).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correct_answer === opt && !!opt}
                                  onChange={() => updateQuestion(qi, { correct_answer: opt })}
                                  className="w-4 h-4 accent-[var(--color-primary)]"
                                  aria-label="Mark as correct"
                                />
                                <input
                                  value={opt}
                                  onChange={(e) => {
                                    const options = [...(q.options ?? [])];
                                    const wasCorrect = q.correct_answer === opt;
                                    options[oi] = e.target.value;
                                    updateQuestion(qi, {
                                      options,
                                      correct_answer: wasCorrect ? e.target.value : q.correct_answer,
                                    });
                                  }}
                                  className="cc-input !py-1.5"
                                  placeholder={`Option ${oi + 1}`}
                                />
                              </div>
                            ))}
                            <p className="text-[11px] text-[var(--color-text-secondary)]">Select the radio next to the correct option.</p>
                          </div>
                        )}
                        {q.type === 'true_false' && (
                          <div className="flex gap-3 text-sm">
                            {['True', 'False'].map((v) => (
                              <label key={v} className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correct_answer === v}
                                  onChange={() => updateQuestion(qi, { correct_answer: v })}
                                  className="accent-[var(--color-primary)]"
                                />
                                {v}
                              </label>
                            ))}
                          </div>
                        )}
                        {q.type === 'fill_blank' && (
                          <input
                            value={String(q.correct_answer ?? '')}
                            onChange={(e) => updateQuestion(qi, { correct_answer: e.target.value })}
                            className="cc-input"
                            placeholder="Correct answer"
                          />
                        )}
                        <div className="flex items-center gap-3">
                          <label className="text-xs text-[var(--color-text-secondary)]">Points</label>
                          <input
                            type="number"
                            min={1}
                            value={q.points}
                            onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) || 1 })}
                            className="cc-input !py-1 !w-20"
                          />
                          <input
                            value={q.explanation ?? ''}
                            onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                            className="cc-input !py-1 flex-1"
                            placeholder="Explanation (shown after grading)"
                          />
                        </div>
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">Passing score (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={lessonDraft.passing_score}
                        onChange={(e) => setLessonDraft({ ...lessonDraft, passing_score: Number(e.target.value) })}
                        className="cc-input !w-28"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setLessonDraft(null);
                      setEditingModuleId(null);
                    }}
                    className="cc-btn cc-btn--ghost"
                  >
                    Cancel
                  </button>
                  <button onClick={handleSaveLesson} disabled={busy} className="cc-btn cc-btn--primary">
                    <Save className="w-4 h-4" /> {busy ? 'Saving…' : 'Save lesson'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Add module */}
      <div className="cc-card p-4 flex gap-2">
        <input
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
          className="cc-input flex-1"
          placeholder={`Module ${modules.length + 1} title — e.g. "Getting started"`}
        />
        <button onClick={handleAddModule} disabled={busy || !newModuleTitle.trim()} className="cc-btn cc-btn--primary">
          <Plus className="w-4 h-4" /> Add module
        </button>
      </div>
    </div>
  );
};

export default CurriculumBuilder;
