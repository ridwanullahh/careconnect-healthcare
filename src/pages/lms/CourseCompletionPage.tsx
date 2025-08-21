import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, CourseEnrollment, Certificate, LMSService } from '../../lib/lms';
import { githubDB, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CourseCompletionPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const currentUserId = 'user-123'; // In real app, from auth context

  useEffect(() => {
    const loadCompletionData = async () => {
      if (!courseId) {
        setError('Course ID not provided');
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
          const userEnrollment = enrollmentData[0];
          setEnrollment(userEnrollment);
          
          // Check if course is actually completed
          if (userEnrollment.progress_percentage < 100) {
            setError('Course is not completed yet');
            setLoading(false);
            return;
          }
          
          // Load certificate if course provides one
          if (courseData.provides_certificate) {
            const certificates = await githubDB.find(collections.certificates, {
              course_id: courseId,
              user_id: currentUserId
            });
            
            if (certificates.length > 0) {
              setCertificate(certificates[0]);
            }
          }
        } else {
          setError('You are not enrolled in this course');
        }
      } catch (err) {
        setError('Failed to load completion data');
        console.error('Error loading completion data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCompletionData();
  }, [courseId]);

  const handleDownloadCertificate = () => {
    if (certificate) {
      // In real implementation, this would download or display the PDF certificate
      window.open(certificate.certificate_url, '_blank');
    }
  };

  const handleViewCertificate = () => {
    setShowCertificate(true);
  };

  const handleShareCertificate = (platform: string) => {
    if (!certificate || !course) return;

    const shareText = `I just completed "${course.title}" and earned a certificate! 🎓`;
    const shareUrl = `${window.location.origin}/certificates/verify/${certificate.verification_code}`;

    switch (platform) {
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
        break;
      default:
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert('Certificate link copied to clipboard!');
    }
  };

  const generateRecommendations = () => {
    if (!course) return [];
    
    // Mock recommendations based on completed course
    return [
      {
        id: 'rec-1',
        title: 'Advanced ' + course.category,
        category: course.category,
        level: 'advanced',
        price: 299,
        is_free: false
      },
      {
        id: 'rec-2',
        title: 'Clinical Applications in ' + course.category,
        category: course.category,
        level: 'intermediate',
        price: 0,
        is_free: true
      }
    ];
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
          <p className="text-gray-600 mb-4">{error || 'Data not found'}</p>
          <button
            onClick={() => navigate('/courses')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  const recommendations = generateRecommendations();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Celebration Header */}
      <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <svg className="mx-auto h-20 w-20 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold mb-4">🎉 Congratulations!</h1>
          <h2 className="text-2xl mb-4">You've completed</h2>
          <h3 className="text-3xl font-semibold mb-6">{course.title}</h3>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            You've successfully mastered the skills and knowledge in this course. 
            {certificate && " Your certificate is ready to download!"}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Course Completion Stats */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Your Achievement</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{enrollment.progress_percentage}%</div>
                <div className="text-sm text-gray-600">Course Progress</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{enrollment.lessons_completed.length}</div>
                <div className="text-sm text-gray-600">Lessons Completed</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round(enrollment.total_time_spent / 60)}h
                </div>
                <div className="text-sm text-gray-600">Time Invested</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {enrollment.overall_score || 'N/A'}%
                </div>
                <div className="text-sm text-gray-600">Overall Score</div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 text-center">
                <strong>Completed on:</strong> {new Date(enrollment.completed_at!).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Certificate Section */}
          {course.provides_certificate && (
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Your Certificate</h3>
                <div className="flex items-center gap-2 text-yellow-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold">Certified</span>
                </div>
              </div>

              {certificate ? (
                <div>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="text-center">
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">Certificate of Completion</h4>
                      <p className="text-gray-600 mb-4">
                        This certifies that you have successfully completed the course requirements
                      </p>
                      <div className="text-lg font-semibold text-primary mb-2">{course.title}</div>
                      <div className="text-sm text-gray-600">
                        Certificate ID: {certificate.certificate_number}
                      </div>
                      <div className="text-sm text-gray-600">
                        Verification Code: {certificate.verification_code}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={handleViewCertificate}
                      className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      View Certificate
                    </button>
                    
                    <button
                      onClick={handleDownloadCertificate}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Download PDF
                    </button>
                    
                    <div className="relative">
                      <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Share Certificate
                      </button>
                      {/* Share dropdown would be implemented here */}
                    </div>
                  </div>

                  {/* Social Share Options */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">Share your achievement:</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleShareCertificate('linkedin')}
                        className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm"
                      >
                        LinkedIn
                      </button>
                      <button
                        onClick={() => handleShareCertificate('twitter')}
                        className="bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors text-sm"
                      >
                        Twitter
                      </button>
                      <button
                        onClick={() => handleShareCertificate('facebook')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Facebook
                      </button>
                      <button
                        onClick={() => handleShareCertificate('copy')}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600">Certificate is being generated...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a few minutes</p>
                </div>
              )}
            </div>
          )}

          {/* Course Review Section */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Rate This Course</h3>
            <p className="text-gray-600 mb-4">
              Help other learners by sharing your experience with this course.
            </p>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium text-gray-700">Your Rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} className="text-2xl text-gray-300 hover:text-yellow-400 transition-colors">
                    ⭐
                  </button>
                ))}
              </div>
            </div>
            
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={4}
              placeholder="Share your thoughts about this course..."
            />
            
            <button className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Submit Review
            </button>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Continue Learning</h3>
            <p className="text-gray-600 mb-6">
              Based on your completed course, here are some recommendations for your next learning journey:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map(rec => (
                <div key={rec.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                  <h4 className="font-semibold text-lg mb-2">{rec.title}</h4>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-600">{rec.category} • {rec.level}</span>
                    <span className="font-bold text-primary">
                      {rec.is_free ? 'Free' : `$${rec.price}`}
                    </span>
                  </div>
                  <button className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
                    Enroll Now
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/courses')}
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Browse More Courses
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificate && certificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Certificate Preview</h3>
                <button
                  onClick={() => setShowCertificate(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Certificate Design */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-4 border-yellow-400 rounded-lg p-12 text-center">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Certificate of Completion</h2>
                  <div className="w-24 h-1 bg-yellow-400 mx-auto"></div>
                </div>
                
                <p className="text-lg text-gray-600 mb-4">This is to certify that</p>
                <h3 className="text-4xl font-bold text-primary mb-6">{certificate.recipient_name}</h3>
                <p className="text-lg text-gray-600 mb-4">has successfully completed the course</p>
                <h4 className="text-2xl font-bold text-gray-800 mb-8">{course.title}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <p className="text-sm text-gray-600">Issued Date</p>
                    <p className="font-semibold">{new Date(certificate.issued_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Certificate ID</p>
                    <p className="font-semibold">{certificate.certificate_number}</p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  <p>CareConnect Healthcare Platform</p>
                  <p>Verification Code: {certificate.verification_code}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCompletionPage;
