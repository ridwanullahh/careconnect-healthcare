// Comprehensive Job Management System
import { githubDB, collections } from './database';

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  salary_range: {
    min: number;
    max: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
  };
  job_type: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  location: {
    type: 'remote' | 'on_site' | 'hybrid';
    city?: string;
    state?: string;
    country?: string;
    address?: string;
  };
  category: string;
  specialties: string[];
  health_center_id: string;
  health_center_name: string;
  posted_by: string;
  status: 'draft' | 'published' | 'paused' | 'closed' | 'pending_approval';
  admin_approved: boolean;
  admin_notes?: string;
  application_deadline?: string;
  start_date?: string;
  featured: boolean;
  urgent: boolean;
  views: number;
  applications_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  contact_email?: string;
  contact_phone?: string;
  application_instructions?: string;
  external_url?: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  job_title: string;
  applicant_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  applicant_type: 'public_user' | 'practitioner' | 'pharmacy';
  resume_url?: string;
  cover_letter: string;
  additional_documents?: string[];
  experience_years?: number;
  current_position?: string;
  availability: {
    start_date: string;
    notice_period?: string;
    flexible: boolean;
  };
  salary_expectation?: {
    min: number;
    max: number;
    currency: string;
    negotiable: boolean;
  };
  status: 'submitted' | 'under_review' | 'shortlisted' | 'interviewed' | 'rejected' | 'hired';
  notes?: string;
  interview_scheduled?: {
    date: string;
    time: string;
    type: 'phone' | 'video' | 'in_person';
    location?: string;
    meeting_link?: string;
  };
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface JobCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  job_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobSavedByUser {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
}

export interface JobAlert {
  id: string;
  user_id: string;
  title: string;
  keywords: string[];
  location?: string;
  job_type?: string;
  salary_min?: number;
  experience_level?: string;
  category?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  last_sent?: string;
  created_at: string;
  updated_at: string;
}

export class JobService {
  // Public job listings (approved only)
  static async getPublicJobs(filters: {
    category?: string;
    location?: string;
    job_type?: string;
    experience_level?: string;
    salary_min?: number;
    salary_max?: number;
    keywords?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<JobPosting[]> {
    let jobs = await githubDB.find(collections.job_postings, {
      status: 'published',
      admin_approved: true
    });

    // Apply filters
    if (filters.category) {
      jobs = jobs.filter(job => job.category === filters.category);
    }

    if (filters.location) {
      const location = filters.location.toLowerCase();
      jobs = jobs.filter(job => 
        job.location.city?.toLowerCase().includes(location) ||
        job.location.state?.toLowerCase().includes(location) ||
        job.location.country?.toLowerCase().includes(location)
      );
    }

    if (filters.job_type) {
      jobs = jobs.filter(job => job.job_type === filters.job_type);
    }

    if (filters.experience_level) {
      jobs = jobs.filter(job => job.experience_level === filters.experience_level);
    }

    if (filters.salary_min) {
      jobs = jobs.filter(job => job.salary_range.min >= filters.salary_min!);
    }

    if (filters.salary_max) {
      jobs = jobs.filter(job => job.salary_range.max <= filters.salary_max!);
    }

    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase();
      jobs = jobs.filter(job =>
        job.title.toLowerCase().includes(keywords) ||
        job.description.toLowerCase().includes(keywords) ||
        job.tags.some(tag => tag.toLowerCase().includes(keywords)) ||
        job.specialties.some(specialty => specialty.toLowerCase().includes(keywords))
      );
    }

    if (filters.featured) {
      jobs = jobs.filter(job => job.featured);
    }

    // Sort by featured first, then by creation date
    jobs.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Apply pagination
    if (filters.offset) {
      jobs = jobs.slice(filters.offset);
    }
    if (filters.limit) {
      jobs = jobs.slice(0, filters.limit);
    }

    return jobs;
  }

  // Get single job posting
  static async getJob(jobId: string): Promise<JobPosting | null> {
    const job = await githubDB.findById(collections.job_postings, jobId);
    
    if (job && job.status === 'published' && job.admin_approved) {
      // Increment view count
      await githubDB.update(collections.job_postings, jobId, {
        views: (job.views || 0) + 1
      });
    }
    
    return job;
  }

  // Health Center: Get their job postings
  static async getJobsByHealthCenter(healthCenterId: string): Promise<JobPosting[]> {
    const jobs = await githubDB.find(collections.job_postings, {
      health_center_id: healthCenterId
    });
    
    return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Health Center: Create job posting
  static async createJob(jobData: Partial<JobPosting>, healthCenterId: string, postedBy: string): Promise<JobPosting> {
    const job: JobPosting = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: jobData.title || '',
      description: jobData.description || '',
      requirements: jobData.requirements || [],
      responsibilities: jobData.responsibilities || [],
      qualifications: jobData.qualifications || [],
      benefits: jobData.benefits || [],
      salary_range: jobData.salary_range || {
        min: 0,
        max: 0,
        currency: 'USD',
        period: 'yearly'
      },
      job_type: jobData.job_type || 'full_time',
      experience_level: jobData.experience_level || 'entry',
      location: jobData.location || {
        type: 'on_site'
      },
      category: jobData.category || 'general',
      specialties: jobData.specialties || [],
      health_center_id: healthCenterId,
      health_center_name: jobData.health_center_name || '',
      posted_by: postedBy,
      status: jobData.status || 'draft',
      admin_approved: false,
      application_deadline: jobData.application_deadline,
      start_date: jobData.start_date,
      featured: jobData.featured || false,
      urgent: jobData.urgent || false,
      views: 0,
      applications_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: jobData.tags || [],
      contact_email: jobData.contact_email,
      contact_phone: jobData.contact_phone,
      application_instructions: jobData.application_instructions,
      external_url: jobData.external_url
    };

    await githubDB.insert(collections.job_postings, job);
    return job;
  }

  // Health Center: Update job posting
  static async updateJob(jobId: string, updates: Partial<JobPosting>): Promise<JobPosting | null> {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    await githubDB.update(collections.job_postings, jobId, updatedData);
    return await this.getJob(jobId);
  }

  // Health Center: Delete job posting
  static async deleteJob(jobId: string): Promise<void> {
    await githubDB.delete(collections.job_postings, jobId);
    
    // Also delete related applications
    const applications = await githubDB.find(collections.job_applications, { job_id: jobId });
    for (const application of applications) {
      await githubDB.delete(collections.job_applications, application.id);
    }
  }

  // Admin: Get all jobs for moderation
  static async getAllJobsForAdmin(filters: {
    status?: string;
    admin_approved?: boolean;
    health_center_id?: string;
  } = {}): Promise<JobPosting[]> {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.admin_approved !== undefined) query.admin_approved = filters.admin_approved;
    if (filters.health_center_id) query.health_center_id = filters.health_center_id;

    const jobs = await githubDB.find(collections.job_postings, query);
    return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Admin: Approve job posting
  static async approveJob(jobId: string, adminNotes?: string): Promise<void> {
    await githubDB.update(collections.job_postings, jobId, {
      admin_approved: true,
      status: 'published',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  // Admin: Reject job posting
  static async rejectJob(jobId: string, adminNotes: string): Promise<void> {
    await githubDB.update(collections.job_postings, jobId, {
      admin_approved: false,
      status: 'draft',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  // Job Applications
  static async submitApplication(applicationData: Partial<JobApplication>): Promise<JobApplication> {
    const application: JobApplication = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      job_id: applicationData.job_id || '',
      job_title: applicationData.job_title || '',
      applicant_id: applicationData.applicant_id || '',
      applicant_name: applicationData.applicant_name || '',
      applicant_email: applicationData.applicant_email || '',
      applicant_phone: applicationData.applicant_phone,
      applicant_type: applicationData.applicant_type || 'public_user',
      resume_url: applicationData.resume_url,
      cover_letter: applicationData.cover_letter || '',
      additional_documents: applicationData.additional_documents || [],
      experience_years: applicationData.experience_years,
      current_position: applicationData.current_position,
      availability: applicationData.availability || {
        start_date: new Date().toISOString(),
        flexible: true
      },
      salary_expectation: applicationData.salary_expectation,
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await githubDB.insert(collections.job_applications, application);

    // Update job applications count
    const job = await this.getJob(application.job_id);
    if (job) {
      await githubDB.update(collections.job_postings, application.job_id, {
        applications_count: (job.applications_count || 0) + 1
      });
    }

    return application;
  }

  // Get applications for a job (Health Center)
  static async getApplicationsForJob(jobId: string): Promise<JobApplication[]> {
    const applications = await githubDB.find(collections.job_applications, { job_id: jobId });
    return applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Get applications by user
  static async getApplicationsByUser(userId: string): Promise<JobApplication[]> {
    const applications = await githubDB.find(collections.job_applications, { applicant_id: userId });
    return applications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Update application status
  static async updateApplicationStatus(
    applicationId: string, 
    status: JobApplication['status'], 
    notes?: string,
    reviewedBy?: string
  ): Promise<void> {
    await githubDB.update(collections.job_applications, applicationId, {
      status,
      notes,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Job Categories
  static async getJobCategories(): Promise<JobCategory[]> {
    const categories = await githubDB.find(collections.job_categories, { is_active: true });
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Initialize default job categories
  static async initializeDefaultCategories(): Promise<void> {
    const existingCategories = await this.getJobCategories();
    if (existingCategories.length > 0) return;

    const defaultCategories = [
      {
        name: 'Nursing',
        description: 'Registered nurses, nurse practitioners, and nursing staff',
        icon: 'Heart',
        color: '#EF4444'
      },
      {
        name: 'Medical Doctors',
        description: 'Physicians, specialists, and medical practitioners',
        icon: 'Stethoscope',
        color: '#3B82F6'
      },
      {
        name: 'Allied Health',
        description: 'Physical therapy, occupational therapy, and other allied health professionals',
        icon: 'Activity',
        color: '#10B981'
      },
      {
        name: 'Administration',
        description: 'Healthcare administration, management, and support staff',
        icon: 'Building',
        color: '#8B5CF6'
      },
      {
        name: 'Pharmacy',
        description: 'Pharmacists, pharmacy technicians, and pharmaceutical staff',
        icon: 'Pill',
        color: '#F59E0B'
      },
      {
        name: 'Mental Health',
        description: 'Psychologists, counselors, and mental health professionals',
        icon: 'Brain',
        color: '#EC4899'
      },
      {
        name: 'Technology',
        description: 'Healthcare IT, medical technology, and digital health roles',
        icon: 'Monitor',
        color: '#6366F1'
      },
      {
        name: 'Research',
        description: 'Clinical research, medical research, and laboratory positions',
        icon: 'Search',
        color: '#059669'
      }
    ];

    for (const categoryData of defaultCategories) {
      const category: JobCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        color: categoryData.color,
        job_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await githubDB.insert(collections.job_categories, category);
    }
  }

  // Save/Unsave job
  static async toggleSaveJob(userId: string, jobId: string): Promise<boolean> {
    const existing = await githubDB.find(collections.job_saved, {
      user_id: userId,
      job_id: jobId
    });

    if (existing.length > 0) {
      // Unsave
      await githubDB.delete(collections.job_saved, existing[0].id);
      return false;
    } else {
      // Save
      const saved: JobSavedByUser = {
        id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        job_id: jobId,
        created_at: new Date().toISOString()
      };
      await githubDB.insert(collections.job_saved, saved);
      return true;
    }
  }

  // Get saved jobs by user
  static async getSavedJobsByUser(userId: string): Promise<JobPosting[]> {
    const savedJobs = await githubDB.find(collections.job_saved, { user_id: userId });
    const jobIds = savedJobs.map(saved => saved.job_id);
    
    const jobs: JobPosting[] = [];
    for (const jobId of jobIds) {
      const job = await this.getJob(jobId);
      if (job) jobs.push(job);
    }
    
    return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Search jobs
  static async searchJobs(query: string, filters: any = {}): Promise<JobPosting[]> {
    return await this.getPublicJobs({
      ...filters,
      keywords: query
    });
  }

  // Get job statistics
  static async getJobStats(): Promise<{
    total_jobs: number;
    active_jobs: number;
    total_applications: number;
    jobs_by_category: { [key: string]: number };
    jobs_by_type: { [key: string]: number };
  }> {
    const allJobs = await githubDB.find(collections.job_postings, {});
    const activeJobs = allJobs.filter(job => job.status === 'published' && job.admin_approved);
    const allApplications = await githubDB.find(collections.job_applications, {});

    const jobsByCategory: { [key: string]: number } = {};
    const jobsByType: { [key: string]: number } = {};

    activeJobs.forEach(job => {
      jobsByCategory[job.category] = (jobsByCategory[job.category] || 0) + 1;
      jobsByType[job.job_type] = (jobsByType[job.job_type] || 0) + 1;
    });

    return {
      total_jobs: allJobs.length,
      active_jobs: activeJobs.length,
      total_applications: allApplications.length,
      jobs_by_category: jobsByCategory,
      jobs_by_type: jobsByType
    };
  }
}