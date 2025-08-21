import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, CourseModule, Lesson, CourseEnrollment, LMSService } from '../../lib/lms';
import { githubDB, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface QuizAnswer {
  questionId: string;
  selectedAnswer: string | string[];
}

const CourseLearningPage = () => {
  const { courseId, moduleId, lessonId } = useParams<{ 
    courseId: string; 
    moduleId: string; 
    lessonId: string; 
  }>();
  const navigate = useNavigate();

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
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const currentUserId = 'user-123'; // In real app, from auth context

  useEffect(() => {
    const loadLearningData = async () => {
      if (!courseId || !moduleId || !lessonId) {
        setError('Missing required parameters');
        setLoading(false);
        return;
      }

      try {
        // Load course and enrollment data
        const [courseData, enrollmentData] = await Promise.all([
          githubDB.findById(collections.courses, courseId),
          githubDB.find(collections.course_enrollments, {
            course_id: courseId,
            user_id: currentUserId
          })
        ]);

        setCourse(courseData);
        if (enrollmentData.length > 0) {
          setEnrollment(enrollmentData[0]);
          setLessonCompleted(enrollmentData[0].lessons_completed.includes(lessonId));
        }

        // Find current module and lesson
        const module = courseData.modules?.find(m => m.id === moduleId);
        if (module) {
          setCurrentModule(module);
          const lesson = module.lessons?.find(l => l.id === lessonId);
          if (lesson) {
            setCurrentLesson(lesson);
            // Initialize quiz answers if it's a quiz
            if (lesson.type === 'quiz' && lesson.content.quiz_data) {
              setQuizAnswers(
                lesson.content.quiz_data.questions.map(q => ({
                  questionId: q.id,
                  selectedAnswer: q.type === 'multiple_choice' ? '' : []
                }))
              );
            }
          } else {
            setError('Lesson not found');
          }
        } else {
          setError('Module not found');
        }
      } catch (err) {
        setError('Failed to load learning data');
        console.error('Error loading learning data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLearningData();
    setLessonStartTime(Date.now());
  }, [courseId, moduleId, lessonId]);

  const handleLessonComplete = async () => {
    if (!enrollment || !currentLesson || lessonCompleted) return;

    const timeSpent = Math.round((Date.now() - lessonStartTime) / 60000); // minutes
    
    try {
      const updatedEnrollment = await LMSService.updateProgress(
        enrollment.id,
        currentLesson.id,
        timeSpent
      );
      setEnrollment(updatedEnrollment);
      setLessonCompleted(true);
      
      // Move to next lesson automatically
      setTimeout(() => {
        navigateToNextLesson();
      }, 1000);
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleQuizSubmit = async () => {
    if (!enrollment || !currentLesson?.content.quiz_data) return;

    try {
      const result = await LMSService.submitQuiz(
        enrollment.id,
        currentLesson.id,
        quizAnswers.map(answer => answer.selectedAnswer)
      );
      
      setQuizScore(result.score);
      setQuizSubmitted(true);
      
      if (result.passed) {
        await handleLessonComplete();
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      alert('Failed to submit quiz. Please try again.');
    }
  };

  const navigateToNextLesson = () => {
    if (!course || !currentModule || !currentLesson) return;

    const currentLessonIndex = currentModule.lessons?.findIndex(l => l.id === lessonId) ?? -1;
    const nextLesson = currentModule.lessons?.[currentLessonIndex + 1];

    if (nextLesson) {
      navigate(`/courses/${courseId}/learn/${moduleId}/${nextLesson.id}`);
    } else {
      // Move to next module
      const currentModuleIndex = course.modules?.findIndex(m => m.id === moduleId) ?? -1;
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

    const currentLessonIndex = currentModule.lessons?.findIndex(l => l.id === lessonId) ?? -1;
    const prevLesson = currentModule.lessons?.[currentLessonIndex - 1];

    if (prevLesson) {
      navigate(`/courses/${courseId}/learn/${moduleId}/${prevLesson.id}`);
    } else {
      // Move to previous module
      const currentModuleIndex = course.modules?.findIndex(m => m.id === moduleId) ?? -1;
      const prevModule = course.modules?.[currentModuleIndex - 1];
      
      if (prevModule && prevModule.lessons && prevModule.lessons.length > 0) {
        const lastLesson = prevModule.lessons[prevModule.lessons.length - 1];
        navigate(`/courses/${courseId}/learn/${prevModule.id}/${lastLesson.id}`);
      }
    }
  };

  const handleQuizAnswerChange = (questionId: string, answer: string | string[]) => {
    setQuizAnswers(prev => 
      prev.map(qa => 
        qa.questionId === questionId 
          ? { ...qa, selectedAnswer: answer }
          : qa
      )
    );
  };

  const renderLessonContent = () => {
    if (!currentLesson) return null;

    switch (currentLesson.type) {
      case 'video':
        return (
          <div className="space-y-6">
            {currentLesson.content.video_url && (
              <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden">
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
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: currentLesson.content.text_content }} />
              </div>
            )}
            {!lessonCompleted && (
              <button
                onClick={handleLessonComplete}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Mark as Complete
              </button>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-6">
            {currentLesson.content.text_content && (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: currentLesson.content.text_content }} />
              </div>
            )}
            {!lessonCompleted && (
              <button
                onClick={handleLessonComplete}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Mark as Complete
              </button>
            )}
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Quiz Instructions</h3>
              <p className="text-blue-700">
                Answer all questions to complete this lesson. 
                {currentLesson.content.quiz_data?.passing_score && 
                  ` You need ${currentLesson.content.quiz_data.passing_score}% to pass.`
                }
              </p>
            </div>

            {currentLesson.content.quiz_data?.questions.map((question, index) => (
              <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-lg mb-4">
                  Question {index + 1}: {question.question}
                </h4>

                {question.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {question.options?.map((option, optionIndex) => (
                      <label key={optionIndex} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          disabled={quizSubmitted}
                          onChange={(e) => handleQuizAnswerChange(question.id, e.target.value)}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'true_false' && (
                  <div className="space-y-2">
                    {['True', 'False'].map((option) => (
                      <label key={option} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          disabled={quizSubmitted}
                          onChange={(e) => handleQuizAnswerChange(question.id, e.target.value)}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'fill_blank' && (
                  <input
                    type="text"
                    disabled={quizSubmitted}
                    onChange={(e) => handleQuizAnswerChange(question.id, e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your answer..."
                  />
                )}

                {quizSubmitted && question.explanation && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Explanation:</strong> {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {!quizSubmitted ? (
              <button
                onClick={handleQuizSubmit}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                disabled={quizAnswers.some(answer => !answer.selectedAnswer || answer.selectedAnswer === '')}
              >
                Submit Quiz
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Quiz Results</h3>
                <p className="text-green-700">
                  Your Score: {quizScore}%
                  {quizScore !== null && quizScore >= (currentLesson.content.quiz_data?.passing_score || 70) ? (
                    <span className="ml-2 text-green-600">✓ Passed</span>
                  ) : (
                    <span className="ml-2 text-red-600">✗ Failed - Please try again</span>
                  )}
                </p>
              </div>
            )}
          </div>
        );

      case 'interactive':
        return (
          <div className="space-y-6">
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Interactive Content</h3>
              <p className="text-gray-600">
                Interactive content would be rendered here (3D models, simulations, etc.)
              </p>
            </div>
            {!lessonCompleted && (
              <button
                onClick={handleLessonComplete}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Mark as Complete
              </button>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Content type not supported</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !course || !currentModule || !currentLesson) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Content not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-80'} overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg truncate">{course.title}</h2>
          {enrollment && (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{enrollment.progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${enrollment.progress_percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto h-full pb-4">
          {course.modules?.map((module, moduleIndex) => (
            <div key={module.id} className="border-b border-gray-100">
              <div className="p-4 bg-gray-50">
                <h3 className="font-medium text-sm text-gray-800">
                  Module {moduleIndex + 1}: {module.title}
                </h3>
              </div>
              
              {module.lessons?.map((lesson, lessonIndex) => {
                const isActive = lesson.id === lessonId;
                const isCompleted = enrollment?.lessons_completed.includes(lesson.id);
                
                return (
                  <button
                    key={lesson.id}
                    onClick={() => navigate(`/courses/${courseId}/learn/${module.id}/${lesson.id}`)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                      isActive 
                        ? 'bg-blue-50 border-l-primary text-primary' 
                        : isCompleted 
                          ? 'border-l-green-500'
                          : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isActive
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isCompleted ? '✓' : lessonIndex + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{lesson.title}</div>
                          <div className="text-xs text-gray-500">
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div>
              <h1 className="text-xl font-semibold">{currentLesson.title}</h1>
              <p className="text-sm text-gray-600">{currentModule.title}</p>
            </div>
            
            {lessonCompleted && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Completed
              </span>
            )}
          </div>

          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            Exit Course
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {currentLesson.description && (
              <p className="text-gray-600 mb-6">{currentLesson.description}</p>
            )}
            
            {renderLessonContent()}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={navigateToPreviousLesson}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <div className="text-sm text-gray-500">
            Lesson {(currentModule.lessons?.findIndex(l => l.id === lessonId) ?? 0) + 1} of {currentModule.lessons?.length ?? 0}
          </div>
          
          <button
            onClick={navigateToNextLesson}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseLearningPage;
