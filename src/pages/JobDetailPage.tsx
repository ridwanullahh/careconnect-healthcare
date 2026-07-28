import React, { useState, useEffect } from 'react';
import { useToastService } from '../lib/toast-service';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { JobService, JobPosting } from '../lib/jobs';
import { useAuth } from '../lib/auth';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Briefcase, MapPin, Clock, DollarSign, Building, Users, Calendar,
  Heart, Share2, ExternalLink, CheckCircle, AlertCircle, Star,
  ArrowLeft, Send, FileText, User, Mail, Phone, Zap
} from 'lucide-react';

const JobDetailPage: React.FC = () => {
  const toast = useToastService();
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationData, setApplicationData] = useState({
    cover_letter: '',
    resume_url: '',
    experience_years: '',
    current_position: '',
    availability_start_date: '',
    salary_expectation_min: '',
    salary_expectation_max: '',
    salary_negotiable: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const loadJob = async () => {
    if (!jobId) return;
    
    setIsLoading(true);
    try {
      const jobData = await JobService.getJob(jobId);
      if (!jobData) {
        navigate('/jobs');
        return;
      }
      setJob(jobData);

      // Check if job is saved by user
      if (user) {
        const savedJobs = await JobService.getSavedJobsByUser(user.id);
        setIsSaved(savedJobs.some(savedJob => savedJob.id === jobId));
      }
    } catch (error) {
      console.error('Failed to load job:', error);
      navigate('/jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveJob = async () => {
    if (!user) {
      toast.showSuccess('Please sign in to save jobs');
      return;
    }

    if (!job) return;

    try {
      const saved = await JobService.toggleSaveJob(user.id, job.id);
      setIsSaved(saved);
    } catch (error) {
      console.error('Failed to save job:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title,
          text: `Check out this job opportunity: ${job?.title} at ${job?.health_center_name}`,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.showSuccess('Job link copied to clipboard!');
    }
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !job) return;

    setIsSubmitting(true);
    try {
      await JobService.submitApplication({
        job_id: job.id,
        job_title: job.title,
        applicant_id: user.id,
        applicant_name: user.profile?.first_name && user.profile?.last_name 
          ? `${user.profile.first_name} ${user.profile.last_name}`
          : user.email.split('@')[0],
        applicant_email: user.email,
        applicant_type: user.user_type as any,
        cover_letter: applicationData.cover_letter,
        resume_url: applicationData.resume_url,
        experience_years: applicationData.experience_years ? parseInt(applicationData.experience_years) : undefined,
        current_position: applicationData.current_position,
        availability: {
          start_date: applicationData.availability_start_date || new Date().toISOString(),
          flexible: true
        },
        salary_expectation: applicationData.salary_expectation_min || applicationData.salary_expectation_max ? {
          min: applicationData.salary_expectation_min ? parseInt(applicationData.salary_expectation_min) : 0,
          max: applicationData.salary_expectation_max ? parseInt(applicationData.salary_expectation_max) : 0,
          currency: 'USD',
          negotiable: applicationData.salary_negotiable
        } : undefined
      });

      toast.showSuccess('Application submitted successfully!');
      setShowApplicationForm(false);
      
      // Refresh job data to update application count
      await loadJob();
    } catch (error) {
      console.error('Failed to submit application:', error);
      toast.showSuccess('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSalary = (salaryRange: JobPosting['salary_range']) => {
    const { min, max, currency, period } = salaryRange;
    if (min === 0 && max === 0) return 'Salary not specified';
    
    const formatAmount = (amount: number) => {
      if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
      return amount.toString();
    };

    const periodText = period === 'yearly' ? '/year' : period === 'monthly' ? '/month' : '/hour';
    
    if (min === max) {
      return `${currency} ${formatAmount(min)}${periodText}`;
    }
    return `${currency} ${formatAmount(min)} - ${formatAmount(max)}${periodText}`;
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just posted';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Job Not Found</h2>
          <Link to="/jobs" className="text-primary hover:underline">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Job Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{job.title}</h1>
                    {job.featured && (
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        Featured
                      </span>
                    )}
                    {job.urgent && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Urgent
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/directory/${job.health_center_id}`}
                    className="text-xl text-primary hover:text-primary/80 transition-colors mb-4 inline-block"
                  >
                    {job.health_center_name}
                  </Link>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {job.location.type === 'remote' ? 'Remote' : `${job.location.city}, ${job.location.state}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.job_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatSalary(job.salary_range)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeSince(job.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={handleSaveJob}
                    className={`p-2 rounded-lg transition-colors ${
                      isSaved
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={isSaved ? 'Remove from saved' : 'Save job'}
                  >
                    <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Share job"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {job.category}
                </span>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {job.experience_level.replace('_', ' ')}
                </span>
                {job.specialties.map((specialty, index) => (
                  <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Job Description</h2>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {job.description}
                </p>
              </div>
            </div>

            {/* Requirements & Responsibilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {job.requirements.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requirements</h3>
                  <ul className="space-y-2">
                    {job.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.responsibilities.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Responsibilities</h3>
                  <ul className="space-y-2">
                    {job.responsibilities.map((responsibility, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Qualifications & Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {job.qualifications.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Qualifications</h3>
                  <ul className="space-y-2">
                    {job.qualifications.map((qualification, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>{qualification}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {job.benefits.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Benefits</h3>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Application Instructions */}
            {job.application_instructions && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Application Instructions</h3>
                <p className="text-blue-800 dark:text-blue-200 whitespace-pre-line">
                  {job.application_instructions}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Apply Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-primary mb-2">
                  {formatSalary(job.salary_range)}
                </div>
                <div className="text-sm text-gray-500">
                  {job.experience_level.replace('_', ' ')} • {job.job_type.replace('_', ' ')}
                </div>
              </div>

              {user ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowApplicationForm(true)}
                    className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-semibold"
                  >
                    Apply Now
                  </button>
                  {job.external_url && (
                    <a
                      href={job.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-center flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Apply on Company Site
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Link
                    to="/register"
                    className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-semibold text-center block"
                  >
                    Sign Up to Apply
                  </Link>
                  <Link
                    to="/login"
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-center block"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {/* Job Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{job.views}</div>
                    <div className="text-sm text-gray-500">Views</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{job.applications_count}</div>
                    <div className="text-sm text-gray-500">Applications</div>
                  </div>
                </div>
              </div>

              {/* Important Dates */}
              <div className="mt-6 space-y-3">
                {job.application_deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {job.start_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Start Date: {new Date(job.start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              {(job.contact_email || job.contact_phone) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    {job.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${job.contact_email}`} className="text-primary hover:underline">
                          {job.contact_email}
                        </a>
                      </div>
                    )}
                    {job.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${job.contact_phone}`} className="text-primary hover:underline">
                          {job.contact_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Company Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About the Company</h3>
              <Link
                to={`/directory/${job.health_center_id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{job.health_center_name}</div>
                  <div className="text-sm text-gray-500">View Company Profile</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Application Modal */}
        {showApplicationForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Apply for {job.title}</h2>
                  <button
                    onClick={() => setShowApplicationForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleApplicationSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cover Letter *
                    </label>
                    <textarea
                      value={applicationData.cover_letter}
                      onChange={(e) => setApplicationData({ ...applicationData, cover_letter: e.target.value })}
                      rows={6}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Tell us why you're interested in this position..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Resume/CV URL
                      </label>
                      <input
                        type="url"
                        value={applicationData.resume_url}
                        onChange={(e) => setApplicationData({ ...applicationData, resume_url: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        value={applicationData.experience_years}
                        onChange={(e) => setApplicationData({ ...applicationData, experience_years: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Position
                    </label>
                    <input
                      type="text"
                      value={applicationData.current_position}
                      onChange={(e) => setApplicationData({ ...applicationData, current_position: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Your current job title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Availability Start Date
                    </label>
                    <input
                      type="date"
                      value={applicationData.availability_start_date}
                      onChange={(e) => setApplicationData({ ...applicationData, availability_start_date: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Salary Expectation (Min)
                      </label>
                      <input
                        type="number"
                        value={applicationData.salary_expectation_min}
                        onChange={(e) => setApplicationData({ ...applicationData, salary_expectation_min: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Minimum expected salary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Salary Expectation (Max)
                      </label>
                      <input
                        type="number"
                        value={applicationData.salary_expectation_max}
                        onChange={(e) => setApplicationData({ ...applicationData, salary_expectation_max: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Maximum expected salary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="salary_negotiable"
                      checked={applicationData.salary_negotiable}
                      onChange={(e) => setApplicationData({ ...applicationData, salary_negotiable: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="salary_negotiable" className="text-sm text-gray-700 dark:text-gray-300">
                      Salary is negotiable
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Application
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApplicationForm(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailPage;