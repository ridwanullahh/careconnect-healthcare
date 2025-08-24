import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Course, CourseEnrollment, LMSService } from '../../lib/lms';
import { githubDB, collections } from '../../lib/database';
import { useAuth } from '../../lib/auth';
import { PaymentService } from '../../lib/payments';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useToastService } from '../../lib/toast-service';

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const { user: currentUser, isAuthenticated } = useAuth();
  const toast = useToastService();

  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) {
        setError('Course ID not provided');
        setLoading(false);
        return;
      }

      try {
        // Load course details
        const courseData = await LMSService.getCourse(courseId);
        setCourse(courseData);

        // Check if user is enrolled (only if authenticated)
        if (isAuthenticated && currentUser) {
          const enrollments = await githubDB.find(collections.course_enrollments, {
            course_id: courseId,
            user_id: currentUser.id
          });
          
          if (enrollments.length > 0) {
            setEnrollment(enrollments[0]);
          }
        }
      } catch (err) {
        setError('Failed to load course details');
        console.error('Error loading course:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  const handleEnroll = async () => {
    if (!courseId || !course) return;
    
    // Check authentication first
    if (!isAuthenticated || !currentUser) {
      toast.showWarning('Please log in to enroll in this course.');
      navigate('/login', { state: { returnTo: `/courses/${courseId}` } });
      return;
    }
    
    setEnrolling(true);
    try {
      // Handle payment for paid courses
      if (!course.is_free) {
        const paymentAmount = course.discounted_price || course.price;
        const paymentResult = await PaymentService.processPayment({
          amount: paymentAmount,
          currency: course.currency,
          description: `Enrollment for ${course.title}`,
          metadata: {
            course_id: courseId,
            user_id: currentUser.id,
            type: 'course_enrollment'
          }
        });
        
        if (!paymentResult.success) {
          throw new Error('Payment failed. Please try again.');
        }
      }
      
      const newEnrollment = await LMSService.enrollUser(courseId, currentUser.id);
      setEnrollment(newEnrollment);
      
      // Show success message
      toast.showSuccess('Successfully enrolled in the course!');
    } catch (err: any) {
      console.error('Enrollment error:', err);
      toast.showError(err.message || 'Failed to enroll. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartCourse = () => {
    if (!isAuthenticated || !currentUser) {
      toast.showWarning('Please log in to start learning.');
      navigate('/login', { state: { returnTo: `/courses/${courseId}` } });
      return;
    }
    
    if (!enrollment) {
      toast.showWarning('Please enroll in the course first.');
      return;
    }
    
    if (course?.modules && course.modules.length > 0) {
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        navigate(`/courses/${courseId}/learn/${firstModule.id}/${firstModule.lessons[0].id}`);
      }
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const calculateTotalDuration = () => {
    if (!course?.modules) return 0;
    return course.modules.reduce((total, module) => {
      return total + (module.lessons?.reduce((lessonTotal, lesson) => 
        lessonTotal + lesson.estimated_duration, 0) || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Course Not Found</h2>
          <p className="text-gray-600">The requested course could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-accent text-white p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {course.category}
                </span>
                {course.provides_certificate && (
                  <span className="bg-yellow-500/20 text-white px-3 py-1 rounded-full text-sm">
                    Certificate Available
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-xl opacity-90 mb-4">{course.short_description}</p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L10 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{Math.round(calculateTotalDuration() / 60)} hours</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{course.level}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                  <span>{course.enrolled_count} students</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{course.rating} ({course.review_count} reviews)</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-4xl font-bold mb-2">
                {course.is_free ? 'Free' : 
                  course.discounted_price ? (
                    <>
                      <span className="line-through text-white/60 text-2xl">${course.price}</span>
                      <br />
                      ${course.discounted_price}
                    </>
                  ) : `$${course.price}`
                }
              </div>
              {course.discounted_price && (
                <div className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                  Save ${course.price - course.discounted_price}!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'curriculum', label: 'Curriculum' },
              { id: 'instructor', label: 'Instructor' },
              { id: 'reviews', label: 'Reviews' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Course Description</h2>
                    <p className="text-gray-600 leading-relaxed">{course.description}</p>
                  </div>
                  
                  {course.learning_objectives && course.learning_objectives.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-3">What You'll Learn</h3>
                      <ul className="space-y-2">
                        {course.learning_objectives.map((objective, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-gray-700">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {course.skills_gained && course.skills_gained.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-3">Skills You'll Gain</h3>
                      <div className="flex flex-wrap gap-2">
                        {course.skills_gained.map((skill, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-3">Prerequisites</h3>
                      <ul className="space-y-2">
                        {course.prerequisites.map((prereq, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-gray-700">{prereq}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Course Curriculum</h2>
                    <div className="text-sm text-gray-600">
                      {course.modules_count} modules • {course.lessons_count} lessons • {Math.round(calculateTotalDuration() / 60)}h total
                    </div>
                  </div>

                  <div className="space-y-3">
                    {course.modules?.map((module, index) => (
                      <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="w-full p-4 text-left hover:bg-gray-50 flex justify-between items-center"
                        >
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              Module {index + 1}: {module.title}
                            </h3>
                            <p className="text-gray-600 text-sm mt-1">{module.description}</p>
                            <div className="flex gap-4 text-xs text-gray-500 mt-2">
                              <span>{module.lessons?.length || 0} lessons</span>
                              <span>{module.lessons?.reduce((total, lesson) => total + lesson.estimated_duration, 0) || 0} min</span>
                            </div>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedModules.has(module.id) ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {expandedModules.has(module.id) && (
                          <div className="border-t border-gray-200 bg-gray-50">
                            {module.lessons?.map((lesson, lessonIndex) => (
                              <div key={lesson.id} className="p-4 border-b border-gray-200 last:border-b-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      {lesson.type === 'video' && (
                                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      {lesson.type === 'text' && (
                                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      {lesson.type === 'quiz' && (
                                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                      <span className="text-sm font-medium text-gray-800">
                                        {lessonIndex + 1}. {lesson.title}
                                      </span>
                                    </div>
                                    {lesson.is_preview && (
                                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                        Preview
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {lesson.estimated_duration} min
                                  </span>
                                </div>
                                {lesson.description && (
                                  <p className="text-sm text-gray-600 mt-1 ml-7">{lesson.description}</p>
                                )}
                              </div>
                            )) || (
                              <div className="p-4 text-sm text-gray-500 italic">
                                No lessons in this module yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )) || (
                      <p className="text-gray-500 italic">Course content not available.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'instructor' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Meet Your Instructor</h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        I
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Healthcare Professional</h3>
                        <p className="text-gray-600 mb-4">
                          Expert healthcare educator with over 10 years of experience in medical training and patient care.
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Students:</span> 2,547
                          </div>
                          <div>
                            <span className="font-medium">Courses:</span> 12
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Student Reviews</h2>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map(star => (
                          <svg key={star} className={`w-5 h-5 ${star <= course.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="font-semibold">{course.rating}</span>
                      <span className="text-gray-600">({course.review_count} reviews)</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Sample reviews */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            JS
                          </div>
                          <span className="font-medium">John Smith</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600">
                        Excellent course with comprehensive content and clear explanations. Highly recommended for healthcare professionals looking to update their knowledge.
                      </p>
                      <div className="text-sm text-gray-500 mt-2">2 weeks ago</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
                {enrollment ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-green-600">You're Enrolled!</h3>
                    
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{enrollment.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${enrollment.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lessons Completed:</span>
                        <span className="font-medium">{enrollment.lessons_completed.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time Spent:</span>
                        <span className="font-medium">{Math.round(enrollment.total_time_spent / 60)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Accessed:</span>
                        <span className="font-medium">
                          {new Date(enrollment.last_accessed).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={handleStartCourse}
                      className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      {enrollment.progress_percentage > 0 ? 'Continue Learning' : 'Start Course'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-dark">Start Learning Today</h3>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{Math.round(calculateTotalDuration() / 60)} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modules:</span>
                        <span className="font-medium">{course.modules_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lessons:</span>
                        <span className="font-medium">{course.lessons_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Certificate:</span>
                        <span className="font-medium">
                          {course.provides_certificate ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Access:</span>
                        <span className="font-medium">Lifetime</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
                    >
                      {enrolling ? 'Enrolling...' : 
                       !isAuthenticated ? 'Login to Enroll' :
                       course.is_free ? 'Enroll for Free' : 
                       course.discounted_price ? `Enroll for $${course.discounted_price}` : `Enroll for $${course.price}`}
                    </button>
                    
                    <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                      Add to Wishlist
                    </button>

                    <div className="text-center text-sm text-gray-600">
                      30-day money-back guarantee
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;