import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, CourseEnrollment, LMSService } from '../../lib/lms';
import { githubDB, collections } from '../../lib/database';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CourseCompletionPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCompletionData = async () => {
      if (!courseId || !isAuthenticated || !currentUser) {
        setError('Access denied');
        setLoading(false);
        return;
      }

      try {
        const [courseData, enrollmentData] = await Promise.all([
          LMSService.getCourse(courseId),
          githubDB.find(collections.course_enrollments, {
            course_id: courseId,
            user_id: currentUser.id
          })
        ]);

        setCourse(courseData);
        
        if (enrollmentData.length === 0) {
          setError('You are not enrolled in this course');
          setLoading(false);
          return;
        }

        const enrollment = enrollmentData[0];
        setEnrollment(enrollment);

        if (enrollment.status !== 'completed') {
          setError('Course not yet completed');
          setLoading(false);
          return;
        }

        if (courseData?.provides_certificate) {
          const certificates = await githubDB.find(collections.certificates, {
            course_id: courseId,
            user_id: currentUser.id
          });
          
          if (certificates.length > 0) {
            setCertificate(certificates[0]);
          }
        }
      } catch (err) {
        setError('Failed to load completion data');
        console.error('Error loading completion data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCompletionData();
  }, [courseId, currentUser, isAuthenticated]);

  const handleDownloadCertificate = () => {
    if (certificate) {
      window.open(certificate.certificate_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !course || !enrollment) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Course completion data not found'}</p>
          <button
            onClick={() => navigate('/courses')}
            className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-800 mb-4">🎉 Congratulations! 🎉</h1>
            <p className="text-xl text-gray-600 mb-2">You have successfully completed</p>
            <h2 className="text-3xl font-bold text-primary mb-6">{course.title}</h2>
            
            <div className="flex justify-center items-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{enrollment.lessons_completed.length} Lessons Completed</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L10 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{Math.round(enrollment.total_time_spent / 60)} Hours Studied</span>
              </div>
            </div>
          </div>

          {course.provides_certificate && (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Your Certificate of Completion</h3>
                
                {certificate ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800 mb-2">
                          Certificate #{certificate.certificate_number}
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          Issued on {new Date(certificate.issued_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Verification Code: {certificate.verification_code}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDownloadCertificate}
                      className="bg-yellow-500 text-white px-8 py-3 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                    >
                      Download Certificate
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-blue-800">
                      Your certificate is being generated. You will receive an email notification once it's ready.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Course Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">What You Learned</h4>
                <ul className="space-y-2">
                  {course.learning_objectives?.slice(0, 4).map((objective, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600 text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Skills Gained</h4>
                <div className="flex flex-wrap gap-2">
                  {course.skills_gained?.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Review Course Content
            </button>
            
            <button
              onClick={() => navigate('/courses')}
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Browse More Courses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCompletionPage;