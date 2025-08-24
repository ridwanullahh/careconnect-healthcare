import React, { useState, useEffect } from 'react';
import { useToastService } from '../lib/toast-service';
import { Link } from 'react-router-dom';
import { JobService, JobPosting, JobCategory } from '../lib/jobs';
import { useAuth } from '../lib/auth';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  Briefcase, MapPin, Clock, DollarSign, Building, Users, Search,
  Filter, Star, Bookmark, ExternalLink, Calendar, TrendingUp,
  Heart, Eye, ChevronRight, AlertCircle, Zap
} from 'lucide-react';

const JobsPage: React.FC = () => {
  const toast = useToastService();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [featuredJobs, setFeaturedJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    job_type: '',
    experience_level: '',
    salary_min: '',
    salary_max: ''
  });
  const [sortBy, setSortBy] = useState('newest');
  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  useEffect(() => {
    loadData();
    JobService.initializeDefaultCategories();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchTerm, filters, sortBy]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allJobs, allCategories, featured] = await Promise.all([
        JobService.getPublicJobs({ limit: 50 }),
        JobService.getJobCategories(),
        JobService.getPublicJobs({ featured: true, limit: 6 })
      ]);

      setJobs(allJobs);
      setCategories(allCategories);
      setFeaturedJobs(featured);

      // Load saved jobs if user is logged in
      if (user) {
        const userSavedJobs = await JobService.getSavedJobsByUser(user.id);
        setSavedJobs(userSavedJobs.map(job => job.id));
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterJobs = async () => {
    try {
      const filteredJobs = await JobService.getPublicJobs({
        keywords: searchTerm || undefined,
        category: filters.category || undefined,
        location: filters.location || undefined,
        job_type: filters.job_type || undefined,
        experience_level: filters.experience_level || undefined,
        salary_min: filters.salary_min ? parseInt(filters.salary_min) : undefined,
        salary_max: filters.salary_max ? parseInt(filters.salary_max) : undefined,
        limit: 50
      });

      // Apply sorting
      let sortedJobs = [...filteredJobs];
      switch (sortBy) {
        case 'salary_high':
          sortedJobs.sort((a, b) => b.salary_range.max - a.salary_range.max);
          break;
        case 'salary_low':
          sortedJobs.sort((a, b) => a.salary_range.min - b.salary_range.min);
          break;
        case 'popular':
          sortedJobs.sort((a, b) => (b.views + b.applications_count) - (a.views + a.applications_count));
          break;
        case 'oldest':
          sortedJobs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        default: // newest
          sortedJobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      setJobs(sortedJobs);
    } catch (error) {
      console.error('Failed to filter jobs:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterJobs();
  };

  const handleSaveJob = async (jobId: string) => {
    if (!user) {
      toast.showSuccess('Please sign in to save jobs');
      return;
    }

    try {
      const isSaved = await JobService.toggleSaveJob(user.id, jobId);
      if (isSaved) {
        setSavedJobs([...savedJobs, jobId]);
      } else {
        setSavedJobs(savedJobs.filter(id => id !== jobId));
      }
    } catch (error) {
      console.error('Failed to save job:', error);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <Briefcase className="w-12 h-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Healthcare Jobs</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover your next career opportunity in healthcare. Find jobs from top healthcare providers.
          </p>
        </div>

        {/* Featured Jobs */}
        {featuredJobs.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Jobs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => (
                <div key={job.id} className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-lg p-6 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{job.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{job.health_center_name}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location.type === 'remote' ? 'Remote' : `${job.location.city}, ${job.location.state}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeSince(job.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                        Featured
                      </span>
                      {job.urgent && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-primary">{formatSalary(job.salary_range)}</span>
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search jobs by title, company, or keywords..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name.toLowerCase().replace(' ', '-')}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="Location"
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />

              <select
                value={filters.job_type}
                onChange={(e) => setFilters({ ...filters, job_type: e.target.value })}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Job Type</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="internship">Internship</option>
              </select>

              <select
                value={filters.experience_level}
                onChange={(e) => setFilters({ ...filters, experience_level: e.target.value })}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Experience</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive</option>
              </select>

              <input
                type="number"
                value={filters.salary_min}
                onChange={(e) => setFilters({ ...filters, salary_min: e.target.value })}
                placeholder="Min Salary"
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="salary_high">Highest Salary</option>
                <option value="salary_low">Lowest Salary</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Search Jobs
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilters({
                    category: '',
                    location: '',
                    job_type: '',
                    experience_level: '',
                    salary_min: '',
                    salary_max: ''
                  });
                  setSortBy('newest');
                }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Job Listings */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {jobs.length} Jobs Found
              </h2>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No jobs found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search criteria or check back later for new opportunities.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {jobs.map((job) => (
                  <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="text-xl font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors"
                          >
                            {job.title}
                          </Link>
                          {job.featured && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
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
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location.type === 'remote' ? 'Remote' : `${job.location.city}, ${job.location.state}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {job.job_type.replace('_', ' ')}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {formatSalary(job.salary_range)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {getTimeSince(job.created_at)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {job.category}
                          </span>
                          {job.specialties.slice(0, 3).map((specialty, index) => (
                            <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleSaveJob(job.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            savedJobs.includes(job.id)
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title={savedJobs.includes(job.id) ? 'Remove from saved' : 'Save job'}
                        >
                          <Heart className={`w-5 h-5 ${savedJobs.includes(job.id) ? 'fill-current' : ''}`} />
                        </button>
                        <Link
                          to={`/jobs/${job.id}`}
                          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium text-center"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {job.views} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {job.applications_count} applications
                        </span>
                      </div>
                      {job.application_deadline && (
                        <span className="text-xs text-orange-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Job Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Browse by Category</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setFilters({ ...filters, category: category.name.toLowerCase().replace(' ', '-') })}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                      <span className="text-sm text-gray-500">{category.job_count}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{category.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {user && (
                  <Link
                    to="/dashboard/applications"
                    className="block w-full text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    My Applications
                  </Link>
                )}
                {user && user.user_type === 'health_center' && (
                  <Link
                    to="/dashboard/jobs/create"
                    className="block w-full text-center bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Post a Job
                  </Link>
                )}
                {!user && (
                  <Link
                    to="/register"
                    className="block w-full text-center bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Sign Up to Apply
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobsPage;