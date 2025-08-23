import React, { useState, useEffect } from 'react';
import { JobService, JobApplication, JobPosting } from '../../lib/jobs';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  Users, FileText, Calendar, DollarSign, MapPin, Clock, 
  CheckCircle, XCircle, Eye, Download, Mail, Phone, User,
  Filter, Search, Star
} from 'lucide-react';

const JobApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && user.user_type === 'health_center') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load health center's jobs
      const healthCenterJobs = await JobService.getJobsByHealthCenter(user.id);
      setJobs(healthCenterJobs);

      // Load all applications for these jobs
      const allApplications: JobApplication[] = [];
      for (const job of healthCenterJobs) {
        const jobApplications = await JobService.getApplicationsForJob(job.id);
        allApplications.push(...jobApplications);
      }
      
      setApplications(allApplications);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, status: JobApplication['status'], notes?: string) => {
    try {
      await JobService.updateApplicationStatus(applicationId, status, notes, user?.id);
      await loadData(); // Reload data
    } catch (error) {
      console.error('Failed to update application status:', error);
      alert('Failed to update application status. Please try again.');
    }
  };

  const getFilteredApplications = () => {
    let filtered = applications;

    // Filter by job
    if (selectedJob !== 'all') {
      filtered = filtered.filter(app => app.job_id === selectedJob);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.applicant_name.toLowerCase().includes(term) ||
        app.applicant_email.toLowerCase().includes(term) ||
        app.job_title.toLowerCase().includes(term) ||
        app.cover_letter.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const getStatusColor = (status: JobApplication['status']) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted': return 'bg-purple-100 text-purple-800';
      case 'interviewed': return 'bg-indigo-100 text-indigo-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSalary = (expectation?: JobApplication['salary_expectation']) => {
    if (!expectation || (expectation.min === 0 && expectation.max === 0)) {
      return 'Not specified';
    }
    
    const { min, max, currency, negotiable } = expectation;
    const formatAmount = (amount: number) => {
      if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
      return amount.toString();
    };

    let salaryText = '';
    if (min === max) {
      salaryText = `${currency} ${formatAmount(min)}`;
    } else {
      salaryText = `${currency} ${formatAmount(min)} - ${formatAmount(max)}`;
    }
    
    return negotiable ? `${salaryText} (negotiable)` : salaryText;
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredApplications = getFilteredApplications();
  const statusCounts = {
    all: applications.length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    interviewed: applications.filter(a => a.status === 'interviewed').length,
    hired: applications.filter(a => a.status === 'hired').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Applications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage applications for your job postings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statusCounts.all}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Applications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statusCounts.submitted}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Under Review</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statusCounts.under_review}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hired</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{statusCounts.hired}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search applications..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Job Filter */}
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interviewed">Interviewed</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedJob('all');
              setStatusFilter('all');
            }}
            className="text-primary hover:text-primary/80 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Applications ({filteredApplications.length})</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No applications found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {applications.length === 0 
                  ? 'No applications have been submitted yet.'
                  : 'No applications match your current filters.'
                }
              </p>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div key={application.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{application.applicant_name}</h3>
                        <p className="text-sm text-gray-500">{application.job_title}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{application.applicant_email}</span>
                      </div>
                      {application.applicant_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{application.applicant_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeSince(application.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatSalary(application.salary_expectation)}</span>
                      </div>
                    </div>

                    {application.experience_years && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Experience:</strong> {application.experience_years} years
                      </p>
                    )}

                    {application.current_position && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Current Position:</strong> {application.current_position}
                      </p>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Cover Letter:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {application.cover_letter}
                      </p>
                    </div>

                    {application.availability && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Available from:</strong> {new Date(application.availability.start_date).toLocaleDateString()}
                        {application.availability.notice_period && (
                          <span> (Notice period: {application.availability.notice_period})</span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 ml-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-center ${getStatusColor(application.status)}`}>
                      {application.status.replace('_', ' ')}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {application.resume_url && (
                        <a
                          href={application.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-2 text-xs bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Resume
                        </a>
                      )}

                      <select
                        value={application.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as JobApplication['status'];
                          const notes = newStatus === 'rejected' 
                            ? prompt('Please provide a reason for rejection:')
                            : undefined;
                          
                          if (newStatus === 'rejected' && !notes) return;
                          
                          handleStatusUpdate(application.id, newStatus, notes || undefined);
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="interviewed">Interviewed</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>

                {application.notes && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Notes:</strong> {application.notes}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default JobApplicationsPage;