import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Course, CourseEnrollment, LMSService } from '../../lib/lms';
import { dbHelpers, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const LMSDashboard = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<(CourseEnrollment & { course: Course })[]>([]);
  const [createdCourses, setCreatedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'learning' | 'teaching'>('learning');

  const currentUserId = 'user-123'; // In real app, from auth context

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load enrolled courses
        const enrollments = await dbHelpers.find(collections.course_enrollments, {
          user_id: currentUserId
        });

        // Load course details for each enrollment
        const enrolledCoursesWithDetails = await Promise.all(
          enrollments.map(async (enrollment) => {
            const course = await dbHelpers.findById(collections.courses, enrollment.course_id);
            return { ...enrollment, course };
          })
        );

        setEnrolledCourses(enrolledCoursesWithDetails);

        // Load courses created by user (for healthcare entities)
        const userCreatedCourses = await dbHelpers.find(collections.courses, {
          instructor_id: currentUserId
        });
        setCreatedCourses(userCreatedCourses);

      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Learning Management</h1>
        <p className="text-gray-600">Track your progress and manage your courses</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('learning')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'learning'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Learning ({enrolledCourses.length})
          </button>
          <button
            onClick={() => setActiveTab('teaching')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'teaching'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Courses ({createdCourses.length})
          </button>
        </nav>
      </div>

      {/* Learning Tab */}
      {activeTab === 'learning' && (
        <div>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{enrolledCourses.length}</p>
                  <p className="text-gray-600">Enrolled Courses</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {enrolledCourses.filter(e => e.status === 'completed').length}
                  </p>
                  <p className="text-gray-600">Completed</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round(enrolledCourses.reduce((sum, e) => sum + e.total_time_spent, 0) / 60)}h
                  </p>
                  <p className="text-gray-600">Time Spent</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {enrolledCourses.filter(e => e.course.provides_certificate && e.status === 'completed').length}
                  </p>
                  <p className="text-gray-600">Certificates</p>
                </div>
              </div>
            </div>
          </div>

          {/* Course Progress */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Course Progress</h3>
            </div>
            
            {enrolledCourses.length === 0 ? (
              <div className="p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by enrolling in a course</p>
                <div className="mt-6">
                  <Link
                    to="/courses"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                  >
                    Browse Courses
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {enrolledCourses.map((enrollment) => (
                  <div key={enrollment.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          {enrollment.course.title}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span>{enrollment.course.category}</span>
                          <span>•</span>
                          <span>{enrollment.course.level}</span>
                          <span>•</span>
                          <span>Last accessed: {new Date(enrollment.last_accessed).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{enrollment.progress_percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getProgressColor(enrollment.progress_percentage)}`}
                                style={{ width: `${enrollment.progress_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            {enrollment.lessons_completed.length} / {enrollment.course.lessons_count} lessons
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col space-y-2">
                        {enrollment.status === 'completed' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Completed
                          </span>
                        ) : (
                          <Link
                            to={`/courses/${enrollment.course_id}`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                          >
                            Continue Learning
                          </Link>
                        )}
                        
                        {enrollment.course.provides_certificate && enrollment.status === 'completed' && (
                          <Link
                            to={`/courses/${enrollment.course_id}/complete`}
                            className="text-sm text-primary hover:text-primary/80"
                          >
                            View Certificate
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teaching Tab */}
      {activeTab === 'teaching' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">My Created Courses</h3>
            <Link
              to="/courses/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
            >
              Create New Course
            </Link>
          </div>

          {createdCourses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No courses created</h3>
              <p className="mt-1 text-sm text-gray-500">Start sharing your knowledge by creating your first course</p>
              <div className="mt-6">
                <Link
                  to="/courses/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                >
                  Create Your First Course
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {createdCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="h-48 bg-gradient-to-r from-primary to-accent"></div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.status === 'published' ? 'bg-green-100 text-green-800' :
                        course.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {course.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {course.enrolled_count} students
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">{course.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.short_description}</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Rating: {course.rating}/5 ({course.review_count})
                      </div>
                      <Link
                        to={`/courses/${course.id}`}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        View Course
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LMSDashboard;
