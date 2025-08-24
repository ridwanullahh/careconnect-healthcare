import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { JobService, JobPosting } from '../../lib/jobs';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { CheckCircle, XCircle, Eye, Users, DollarSign, MapPin, Clock, Star, Zap, Building } from 'lucide-react';

const AdminJobManagementPage: React.FC = () => {
  const toast = useToastService();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [stats, setStats] = useState({
    total_jobs: 0,
    active_jobs: 0,
    total_applications: 0,
    jobs_by_category: {} as { [key: string]: number },
    jobs_by_type: {} as { [key: string]: number }
  });

  useEffect(() => {
    if (user && user.user_type === 'super_admin') {
      loadJobs();
      loadStats();
    }
  }, [user, filter]);

  const loadJobs = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let filteredJobs: JobPosting[];
      
      switch (filter) {
        case 'pending':
          filteredJobs = await JobService.getAllJobsForAdmin({ admin_approved: false, status: 'pending_approval' });
          break;
        case 'approved':
          filteredJobs = await JobService.getAllJobsForAdmin({ admin_approved: true });
          break;
        case 'rejected':
          filteredJobs = await JobService.getAllJobsForAdmin({ admin_approved: false, status: 'draft' });
          break;
        default:
          filteredJobs = await JobService.getAllJobsForAdmin();
      }
      
      setJobs(filteredJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const jobStats = await JobService.getJobStats();
      setStats(jobStats);
    } catch (error) {
      console.error('Failed to load job stats:', error);
    }
  };

  const handleApprove = async (jobId: string) => {
    try {
      await JobService.approveJob(jobId, 'Approved by admin');
      await loadJobs();
      await loadStats();
    } catch (error) {
      console.error('Failed to approve job:', error);
      toast.showSuccess('Failed to approve job. Please try again.');
    }
  };

  const handleReject = async (jobId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await JobService.rejectJob(jobId, reason);
      await loadJobs();
      await loadStats();
    } catch (error) {
      console.error('Failed to reject job:', error);
      toast.showSuccess('Failed to reject job. Please try again.');
    }
  };

  const formatSalary = (salaryRange: JobPosting['salary_range']) => {
    const { min, max, currency, period } = salaryRange;
    if (min === 0 && max === 0) return 'Not specified';
    
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Moderate job postings and manage platform jobs</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_jobs}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_jobs}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Applications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_applications}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {jobs.filter(job => !job.admin_approved && job.status === 'pending_approval').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'pending', label: 'Pending Approval', count: jobs.filter(j => !j.admin_approved && j.status === 'pending_approval').length },
              { key: 'approved', label: 'Approved', count: jobs.filter(j => j.admin_approved).length },
              { key: 'rejected', label: 'Rejected', count: jobs.filter(j => !j.admin_approved && j.status === 'draft').length },
              { key: 'all', label: 'All Jobs', count: jobs.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  filter === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    filter === tab.key 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Job Postings ({jobs.length})</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No jobs found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'pending' ? 'No jobs pending approval.' : 'No jobs match the current filter.'}
              </p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                      {job.featured && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Featured
                        </span>
                      )}
                      {job.urgent && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Urgent
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{job.health_center_name}</p>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{job.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location.type === 'remote' ? 'Remote' : `${job.location.city}, ${job.location.state}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatSalary(job.salary_range)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {getTimeSince(job.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {job.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {job.applications_count} applications
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {job.category}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        {job.experience_level.replace('_', ' ')}
                      </span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                        {job.job_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-center ${
                      job.admin_approved && job.status === 'published' ? 'bg-green-100 text-green-800' :
                      job.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {job.admin_approved && job.status === 'published' ? 'Approved' : 
                       job.status === 'pending_approval' ? 'Pending' : 'Rejected'}
                    </span>
                    
                    {!job.admin_approved && job.status === 'pending_approval' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(job.id)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          title="Approve Job"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(job.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Reject Job"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {job.admin_notes && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Admin Notes:</strong> {job.admin_notes}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Categories Stats */}
      {Object.keys(stats.jobs_by_category).length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jobs by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.jobs_by_category).map(([category, count]) => (
              <div key={category} className="text-center">
                <div className="text-2xl font-bold text-primary">{count}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {category.replace('-', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminJobManagementPage;