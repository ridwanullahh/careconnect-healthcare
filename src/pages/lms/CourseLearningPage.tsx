import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Course,
  CourseModule,
  Lesson,
  CourseEnrollment,
  LMSService,
  ModuleType,
  QuizData,
  QuizQuestion,
  EnrollmentStatus,
} from '../../lib/lms';
import { githubDB as dbHelpers, collections } from '../../lib/database';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import {
  CheckCircle2,
  XCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface QuizAnswer {
  questionId: string;
  selectedAnswer: string | string[];
}

interface QuestionResult {
  questionId: string;
  correct: boolean;
  correctAnswer: string;
  userAnswer: string;
  explanation?: string;
}

interface CertificateInfo {
  number: string;
}

/**
 * Resolve the quiz payload for a lesson. The seeded PRODUCTION_COURSES
 * store quiz data under `lesson.content.quiz_data`, while QuizService-created
 * lessons store questions at the top level. Support both shapes.
 */
const getQuizData = (lesson: Lesson | null): QuizData | null => {
  if (!lesson) return null;
  const fromContent = lesson.content?.quiz_data;
  if (fromContent && Array.isArray(fromContent.questions)) {
    return fromContent as QuizData;
  }
  const anyLesson = lesson as unknown as {
    questions?: QuizQuestion[];
    passing_score?: number;
    attempts_allowed?: number;
  };
  if (Array.isArray(anyLesson.questions) && anyLesson.questions.length > 0) {
    return {
      questions: anyLesson.questions,
      passing_score: anyLesson.passing_score ?? 70,
      attempts_allowed: anyLesson.attempts_allowed ?? 3,
      randomize_questions: false,
      show_correct_answers: true,
    };
  }
  return null;
};

const isMultiChoice = (q: QuizQuestion): boolean => {
  // Heuristic: a question is "multi-choice" (allowing multiple selections)
  // when its correct_answer is an array with more than one entry.
  return Array.isArray(q.correct_answer) && q.correct_answer.length > 1;
};

const normalizeString = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  return String(value);
};

const CourseLearningPage: React.FC = () => {
  const {
    courseId,
    moduleId,
    lessonId,
  } = useParams<{ courseId: string; moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [currentModule, setCurrentModule] = useState<CourseModule | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Learning state
  const [lessonStartTime, setLessonStartTime] = useState<number>(Date.now());
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [courseCompleted, setCourseCompleted] = useState(false);

  const quizData = getQuizData(currentLesson);

  // ---- Data load ----
  useEffect(() => {
    const loadLearningData = async () => {
      if (!courseId || !moduleId || !lessonId) {
        setError('Missing required parameters');
        setLoading(false);
        return;
      }

      try {
        if (!isAuthenticated || !currentUser) {
          setError('Please log in to access course content');
          setLoading(false);
          navigate('/login', {
            state: { returnTo: `/courses/${courseId}/learn/${moduleId}/${lessonId}` },
          });
          return;
        }

        const [courseData, enrollmentData] = await Promise.all([
          LMSService.getCourse(courseId),
          dbHelpers.find<CourseEnrollment>(collections.course_enrollments, {
            course_id: courseId,
            user_id: currentUser.id,
          }),
        ]);

        setCourse(courseData);

        if (enrollmentData.length === 0) {
          setError('You are not enrolled in this course');
          setLoading(false);
          navigate(`/courses/${courseId}`);
          return;
        }

        const enr = enrollmentData[0];
        setEnrollment(enr);
        setLessonCompleted(enr.lessons_completed?.includes(lessonId) ?? false);
        setCourseCompleted(enr.status === EnrollmentStatus.COMPLETED);

        // If the course is already completed, look up an existing certificate
        if (enr.status === EnrollmentStatus.COMPLETED && courseData?.provides_certificate) {
          try {
            const certs = await dbHelpers.find(collections.certificates, {
              course_id: courseId,
              user_id: currentUser.id,
            });
            if (certs.length > 0 && certs[0].certificate_number) {
              setCertificateInfo({ number: certs[0].certificate_number });
            }
          } catch {
            // Non-fatal
          }
        }

        const module = courseData?.modules?.find((m) => m.id === moduleId);
        if (module) {
          setCurrentModule(module);
          const lesson = module.lessons?.find((l) => l.id === lessonId);
          if (lesson) {
            setCurrentLesson(lesson);
            const qData = getQuizData(lesson);
            if (qData) {
              setQuizAnswers(
                qData.questions.map((q) => ({
                  questionId: q.id,
                  selectedAnswer: isMultiChoice(q) ? [] : '',
                })),
              );
            }
          } else {
            setError('Lesson not found');
          }
        } else {
          setError('Module not found');
        }
      } catch (err) {
        console.error('Error loading learning data:', err);
        setError('Failed to load learning data');
      } finally {
        setLoading(false);
      }
    };

    loadLearningData();
    setLessonStartTime(Date.now());
    // Reset quiz state when lesson changes
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizPassed(null);
    setQuestionResults([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, moduleId, lessonId]);

  // ---- Helpers ----
  const computeActualLessonsCount = useCallback(async (): Promise<number> => {
    if (!courseId) return 0;
    try {
      const modules = await dbHelpers.find<CourseModule>(collections.course_modules, {
        course_id: courseId,
      });
      let count = 0;
      for (const m of modules) {
        const lessons = await dbHelpers.find<Lesson>(collections.course_lessons, {
          module_id: m.id,
        });
        count += lessons.length;
      }
      return count;
    } catch {
      return 0;
    }
  }, [courseId]);

  const markLessonComplete = useCallback(
    async (lessonIdToComplete: string) => {
      if (!enrollment || !currentUser || !course) return null;
      const alreadyCompleted = enrollment.lessons_completed?.includes(lessonIdToComplete);
      if (alreadyCompleted) {
        setLessonCompleted(true);
        return null;
      }

      const timeSpent = Math.max(0, Math.round((Date.now() - lessonStartTime) / 60000));
      const lessonsCompleted = [...(enrollment.lessons_completed || []), lessonIdToComplete];

      const actualLessonsCount = await computeActualLessonsCount();
      const denominator = actualLessonsCount > 0 ? actualLessonsCount : course.lessons_count || 1;
      const progressPercentage = Math.min(
        100,
        Math.round((lessonsCompleted.length / denominator) * 100),
      );

      const updates: Partial<CourseEnrollment> & {
        total_time_spent?: number;
        last_accessed?: string;
      } = {
        lessons_completed: lessonsCompleted,
        progress_percentage: progressPercentage,
        total_time_spent: (enrollment.total_time_spent || 0) + timeSpent,
        last_accessed: new Date().toISOString(),
      };

      let newCertificate: CertificateInfo | null = null;

      if (progressPercentage >= 100 && enrollment.status !== EnrollmentStatus.COMPLETED) {
        updates.status = EnrollmentStatus.COMPLETED;
        updates.completed_at = new Date().toISOString();
        // Generate certificate if applicable
        if (course.provides_certificate) {
          try {
            const cert = await LMSService.generateCertificate(course.id, currentUser.id);
            newCertificate = { number: cert.certificate_number };
          } catch (e) {
            console.error('Certificate generation failed:', e);
          }
        }
      }

      try {
        const updated = await dbHelpers.update<CourseEnrollment>(
          collections.course_enrollments,
          enrollment.id,
          updates,
        );
        setEnrollment(updated);
        setLessonCompleted(true);
        if (newCertificate) {
          setCertificateInfo(newCertificate);
          setCourseCompleted(true);
        } else if (updates.status === EnrollmentStatus.COMPLETED) {
          setCourseCompleted(true);
        }
        return newCertificate;
      } catch (err) {
        console.error('Error updating progress:', err);
        return null;
      }
    },
    [enrollment, currentUser, course, lessonStartTime, computeActualLessonsCount],
  );

  const handleLessonComplete = async () => {
    if (!currentLesson || lessonCompleted) return;
    await markLessonComplete(currentLesson.id);
  };

  // ---- Quiz submission (inline grading) ----
  const handleQuizSubmit = async () => {
    if (!enrollment || !currentLesson || !quizData || !currentUser) return;
    if (submittingQuiz) return;

    setSubmittingQuiz(true);
    try {
      let totalPoints = 0;
      let earnedPoints = 0;
      const answersRecord: Record<string, string> = {};
      const results: QuestionResult[] = [];

      for (const q of quizData.questions) {
        totalPoints += q.points || 0;
        const ans = quizAnswers.find((a) => a.questionId === q.id);
        const userAnswerRaw = ans?.selectedAnswer;

        // Persist answer as a string for the course_progress record
        const userAnswerStr = Array.isArray(userAnswerRaw)
          ? userAnswerRaw.join('|')
          : (userAnswerRaw as string) || '';
        answersRecord[q.id] = userAnswerStr;

        let isCorrect = false;
        const correctStr = normalizeString(q.correct_answer);

        if (isMultiChoice(q)) {
          const correctArr = (q.correct_answer as string[]).map((s) =>
            String(s).toLowerCase().trim(),
          );
          const userArr = Array.isArray(userAnswerRaw)
            ? (userAnswerRaw as string[]).map((s) => String(s).toLowerCase().trim())
            : [];
          // All correct answers must be present, no extras
          isCorrect =
            userArr.length === correctArr.length &&
            userArr.every((u) => correctArr.includes(u));
        } else if (q.type === 'fill_blank') {
          const correctArr = Array.isArray(q.correct_answer)
            ? (q.correct_answer as string[])
            : [String(q.correct_answer)];
          const userStr = String(userAnswerRaw || '').toLowerCase().trim();
          isCorrect = correctArr.some((c) => String(c).toLowerCase().trim() === userStr);
        } else if (q.type === 'true_false' || q.type === 'multiple_choice') {
          isCorrect =
            String(userAnswerRaw || '').toLowerCase().trim() ===
            String(q.correct_answer).toLowerCase().trim();
        }

        if (isCorrect) earnedPoints += q.points || 0;
        results.push({
          questionId: q.id,
          correct: isCorrect,
          correctAnswer: correctStr,
          userAnswer: userAnswerStr,
          explanation: q.explanation,
        });
      }

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= (quizData.passing_score || 70);

      setQuizScore(score);
      setQuizPassed(passed);
      setQuestionResults(results);
      setQuizSubmitted(true);

      // 1) Save attempt to course_progress collection
      try {
        await dbHelpers.insert(collections.course_progress, {
          quiz_id: currentLesson.id,
          module_id: currentLesson.module_id,
          user_id: currentUser.id,
          course_id: courseId,
          type: 'quiz_attempt',
          answers: answersRecord,
          score: earnedPoints,
          total_points: totalPoints,
          percentage: score,
          passed,
          started_at: new Date(lessonStartTime).toISOString(),
          completed_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error saving quiz attempt to course_progress:', e);
      }

      // 2) Update enrollment quiz scores + mark lesson complete if passed
      try {
        const updatedQuizScores = {
          ...(enrollment.quiz_scores || {}),
          [currentLesson.id]: {
            score,
            attempts: (enrollment.quiz_scores?.[currentLesson.id]?.attempts || 0) + 1,
            completed_at: new Date().toISOString(),
          },
        };
        const updatedQuizzesCompleted = passed && !(enrollment.quizzes_completed || []).includes(currentLesson.id)
          ? [...(enrollment.quizzes_completed || []), currentLesson.id]
          : enrollment.quizzes_completed || [];

        await dbHelpers.update<CourseEnrollment>(
          collections.course_enrollments,
          enrollment.id,
          {
            quiz_scores: updatedQuizScores,
            quizzes_completed: updatedQuizzesCompleted,
          },
        );
        // Refresh local enrollment state without overwriting lessons_completed logic
        setEnrollment((prev) =>
          prev
            ? {
                ...prev,
                quiz_scores: updatedQuizScores,
                quizzes_completed: updatedQuizzesCompleted,
              }
            : prev,
        );
      } catch (e) {
        console.error('Error updating enrollment quiz scores:', e);
      }

      // 3) If passed, mark lesson complete (which may also generate a certificate)
      if (passed) {
        await markLessonComplete(currentLesson.id);
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleRetakeQuiz = () => {
    if (!quizData) return;
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizPassed(null);
    setQuestionResults([]);
    setQuizAnswers(
      quizData.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: isMultiChoice(q) ? [] : '',
      })),
    );
  };

  // ---- Navigation ----
  const navigateToNextLesson = () => {
    if (!course || !currentModule || !currentLesson) return;

    const currentLessonIndex = currentModule.lessons?.findIndex((l) => l.id === lessonId) ?? -1;
    const nextLesson = currentModule.lessons?.[currentLessonIndex + 1];

    if (nextLesson) {
      navigate(`/courses/${courseId}/learn/${moduleId}/${nextLesson.id}`);
    } else {
      const currentModuleIndex = course.modules?.findIndex((m) => m.id === moduleId) ?? -1;
      const nextModule = course.modules?.[currentModuleIndex + 1];
      if (nextModule && nextModule.lessons && nextModule.lessons.length > 0) {
        navigate(`/courses/${courseId}/learn/${nextModule.id}/${nextModule.lessons[0].id}`);
      } else {
        // Course completed
        navigate(`/courses/${courseId}/complete`);
      }
    }
  };

  const navigateToPreviousLesson = () => {
    if (!course || !currentModule || !currentLesson) return;

    const currentLessonIndex = currentModule.lessons?.findIndex((l) => l.id === lessonId) ?? -1;
    const prevLesson = currentModule.lessons?.[currentLessonIndex - 1];

    if (prevLesson) {
      navigate(`/courses/${courseId}/learn/${moduleId}/${prevLesson.id}`);
    } else {
      const currentModuleIndex = course.modules?.findIndex((m) => m.id === moduleId) ?? -1;
      const prevModule = course.modules?.[currentModuleIndex - 1];
      if (prevModule && prevModule.lessons && prevModule.lessons.length > 0) {
        const lastLesson = prevModule.lessons[prevModule.lessons.length - 1];
        navigate(`/courses/${courseId}/learn/${prevModule.id}/${lastLesson.id}`);
      }
    }
  };

  const handleQuizAnswerChange = (questionId: string, answer: string | string[]) => {
    setQuizAnswers((prev) =>
      prev.map((qa) => (qa.questionId === questionId ? { ...qa, selectedAnswer: answer } : qa)),
    );
  };

  const handleMultiChoiceToggle = (questionId: string, option: string, checked: boolean) => {
    setQuizAnswers((prev) =>
      prev.map((qa) => {
        if (qa.questionId !== questionId) return qa;
        const current = Array.isArray(qa.selectedAnswer) ? qa.selectedAnswer : [];
        const next = checked
          ? Array.from(new Set([...current, option]))
          : current.filter((o) => o !== option);
        return { ...qa, selectedAnswer: next };
      }),
    );
  };

  // ---- Render: lesson content ----
  const renderLessonContent = () => {
    if (!currentLesson) return null;

    switch (currentLesson.type) {
      case ModuleType.VIDEO:
        return (
          <div className="space-y-6">
            {currentLesson.content.video_url && (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full"
                  onEnded={handleLessonComplete}
                >
                  <source src={currentLesson.content.video_url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {currentLesson.content.text_content && (
              <div className="prose max-w-none text-slate-700">
                <div dangerouslySetInnerHTML={{ __html: currentLesson.content.text_content }} />
              </div>
            )}
            {!lessonCompleted && (
              <Button onClick={handleLessonComplete}>Mark as Complete</Button>
            )}
          </div>
        );

      case ModuleType.TEXT:
        return (
          <div className="space-y-6">
            {currentLesson.content.text_content && (
              <div className="prose max-w-none text-slate-700">
                <div dangerouslySetInnerHTML={{ __html: currentLesson.content.text_content }} />
              </div>
            )}
            {!lessonCompleted ? (
              <Button onClick={handleLessonComplete}>Mark as Complete</Button>
            ) : null}
          </div>
        );

      case ModuleType.QUIZ: {
        if (!quizData) {
          return (
            <Card>
              <CardContent className="p-6 text-center text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                This quiz has no questions configured yet.
              </CardContent>
            </Card>
          );
        }
        const allAnswered = quizAnswers.every((a) => {
          if (Array.isArray(a.selectedAnswer)) return a.selectedAnswer.length > 0;
          return a.selectedAnswer !== '' && a.selectedAnswer !== null && a.selectedAnswer !== undefined;
        });

        return (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h3 className="font-semibold text-teal-800 mb-1">Quiz Instructions</h3>
              <p className="text-teal-700 text-sm">
                Answer all questions to complete this lesson. You need{' '}
                <span className="font-semibold">{quizData.passing_score || 70}%</span> to pass.
                {quizData.attempts_allowed
                  ? ` You have up to ${quizData.attempts_allowed} attempt(s).`
                  : ''}
              </p>
            </div>

            {/* Questions */}
            {quizData.questions.map((question, index) => {
              const result = questionResults.find((r) => r.questionId === question.id);
              const multi = isMultiChoice(question);
              const userAnswer = quizAnswers.find((a) => a.questionId === question.id)?.selectedAnswer;

              return (
                <Card key={question.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <h4 className="font-semibold text-lg text-slate-800">
                        Question {index + 1}: {question.question}
                      </h4>
                      {quizSubmitted && result && (
                        <div className="flex-shrink-0">
                          {result.correct ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              Incorrect
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mb-3">
                      {question.points} point{question.points === 1 ? '' : 's'} •{' '}
                      {question.type === 'multiple_choice'
                        ? multi
                          ? 'Multiple select'
                          : 'Single select'
                        : question.type === 'true_false'
                          ? 'True / False'
                          : question.type === 'fill_blank'
                            ? 'Fill in the blank'
                            : question.type}
                    </p>

                    {(question.type === 'multiple_choice' || question.type === 'true_false') && (
                      <div className="space-y-2">
                        {(question.options || []).map((option, optionIndex) => {
                          const isSelected = multi
                            ? Array.isArray(userAnswer) && userAnswer.includes(option)
                            : userAnswer === option;
                          return (
                            <label
                              key={optionIndex}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-emerald-400 bg-emerald-50'
                                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                              } ${quizSubmitted ? 'cursor-default' : ''}`}
                            >
                              <input
                                type={multi ? 'checkbox' : 'radio'}
                                name={`question-${question.id}`}
                                value={option}
                                disabled={quizSubmitted}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (multi) {
                                    handleMultiChoiceToggle(question.id, option, e.target.checked);
                                  } else {
                                    handleQuizAnswerChange(question.id, option);
                                  }
                                }}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                              />
                              <span className="text-slate-700">{option}</span>
                              {quizSubmitted && result && (
                                <span className="ml-auto text-xs">
                                  {Array.isArray(question.correct_answer)
                                    ? (question.correct_answer as string[]).includes(option)
                                      ? (
                                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct answer
                                        </span>
                                      )
                                      : null
                                    : question.correct_answer === option
                                      ? (
                                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct answer
                                        </span>
                                      )
                                      : null}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {question.type === 'fill_blank' && (
                      <input
                        type="text"
                        disabled={quizSubmitted}
                        value={
                          Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer as string) || ''
                        }
                        onChange={(e) => handleQuizAnswerChange(question.id, e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Enter your answer..."
                      />
                    )}

                    {quizSubmitted && result && (
                      <div className="mt-4 space-y-2">
                        {!result.correct && (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-sm text-emerald-800">
                              <strong>Correct answer:</strong> {result.correctAnswer}
                            </p>
                            {result.userAnswer && (
                              <p className="text-sm text-rose-700 mt-1">
                                <strong>Your answer:</strong> {result.userAnswer.replace(/\|/g, ', ')}
                              </p>
                            )}
                          </div>
                        )}
                        {result.explanation && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-600">
                              <strong>Explanation:</strong> {result.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Submit / Results */}
            {!quizSubmitted ? (
              <Button
                onClick={handleQuizSubmit}
                disabled={!allAnswered || submittingQuiz}
                className="w-full sm:w-auto"
              >
                {submittingQuiz ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                        {quizPassed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600" />
                        )}
                        Quiz Results
                      </h3>
                      <p className="text-slate-700">
                        Your score:{' '}
                        <span className="font-semibold">{quizScore}%</span> (passing:{' '}
                        {quizData.passing_score || 70}%)
                      </p>
                      <p
                        className={`text-sm mt-1 ${
                          quizPassed ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {quizPassed
                          ? 'Passed — lesson marked complete.'
                          : 'Did not pass. You can retake the quiz.'}
                      </p>
                    </div>
                    {!quizPassed && (
                      <Button variant="outline" onClick={handleRetakeQuiz} className="flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4" />
                        Retake Quiz
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      }

      case ModuleType.INTERACTIVE:
        return (
          <div className="space-y-6">
            <div className="bg-slate-100 rounded-lg p-8 text-center">
              <h3 className="text-lg font-semibold mb-2 text-slate-800">Interactive Content</h3>
              <p className="text-slate-600">
                Interactive content would be rendered here (3D models, simulations, etc.)
              </p>
            </div>
            {!lessonCompleted && (
              <Button onClick={handleLessonComplete}>Mark as Complete</Button>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-slate-500">
            Content type not supported
          </div>
        );
    }
  };

  // ---- Render: gating ----
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading lesson..." />
      </div>
    );
  }

  if (error || !course || !currentModule || !currentLesson) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-rose-600 mb-2">Error</h2>
          <p className="text-slate-600 mb-4">{error || 'Content not found'}</p>
          <Button variant="outline" onClick={() => navigate('/courses')}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <div
        className={`bg-white border-r border-slate-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-0' : 'w-80'
        } overflow-hidden flex-shrink-0`}
      >
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold text-lg truncate text-slate-800">{course.title}</h2>
          {enrollment && (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>Progress</span>
                <span>{Math.round(enrollment.progress_percentage || 0)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round(enrollment.progress_percentage || 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto h-[calc(100vh-200px)] pb-4 max-h-[80vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:bg-slate-100">
          {course.modules?.map((module, moduleIndex) => (
            <div key={module.id} className="border-b border-slate-100">
              <div className="p-4 bg-slate-50">
                <h3 className="font-medium text-sm text-slate-800">
                  Module {moduleIndex + 1}: {module.title}
                </h3>
              </div>

              {module.lessons?.map((lesson, lessonIndex) => {
                const isActive = lesson.id === lessonId;
                const isCompleted = enrollment?.lessons_completed?.includes(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    onClick={() =>
                      navigate(`/courses/${courseId}/learn/${module.id}/${lesson.id}`)
                    }
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-l-4 ${
                      isActive
                        ? 'bg-emerald-50 border-l-emerald-600 text-emerald-800'
                        : isCompleted
                          ? 'border-l-emerald-500'
                          : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : isActive
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : lessonIndex + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{lesson.title}</div>
                          <div className="text-xs text-slate-500 capitalize">
                            {lesson.type} • {lesson.estimated_duration} min
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-800 truncate">
                {currentLesson.title}
              </h1>
              <p className="text-sm text-slate-600 truncate">{currentModule.title}</p>
            </div>

            {lessonCompleted && (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </Badge>
            )}
          </div>

          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1.5 text-sm flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Course</span>
          </button>
        </div>

        {/* Certificate banner (course completed) */}
        {courseCompleted && certificateInfo && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <Award className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">
                Congratulations — you completed this course and earned a certificate.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 self-start sm:self-auto"
              onClick={() => navigate(`/certificate/${certificateInfo.number}`)}
            >
              <Award className="w-4 h-4" />
              View Certificate
            </Button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {currentLesson.description && (
              <p className="text-slate-600 mb-6">{currentLesson.description}</p>
            )}

            {renderLessonContent()}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-4 flex justify-between items-center gap-3">
          <Button variant="outline" onClick={navigateToPreviousLesson} className="flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="text-sm text-slate-500">
            Lesson {(currentModule.lessons?.findIndex((l) => l.id === lessonId) ?? 0) + 1} of{' '}
            {currentModule.lessons?.length ?? 0}
          </div>

          <Button onClick={navigateToNextLesson} className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseLearningPage;
