// Learning Management System for CareConnect Healthcare Platform
import { githubDB, collections } from './database';

// Course Status
export enum CourseStatus {
  DRAFT = 'draft',
  UNDER_REVIEW = 'under_review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

// Course Level
export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

// Course Type
export enum CourseType {
  SELF_PACED = 'self_paced',
  INSTRUCTOR_LED = 'instructor_led',
  HYBRID = 'hybrid',
  CERTIFICATION = 'certification'
}

// Module Type
export enum ModuleType {
  VIDEO = 'video',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  LIVE_SESSION = 'live_session',
  DOCUMENT = 'document',
  INTERACTIVE = 'interactive'
}

// Enrollment Status
export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  SUSPENDED = 'suspended'
}

// Course Interface
export interface Course {
  id: string;
  entity_id: string; // Healthcare entity offering the course
  instructor_id: string;
  
  // Basic Information
  title: string;
  description: string;
  short_description: string;
  thumbnail_url: string;
  banner_url?: string;
  
  // Course Details
  category: string;
  subcategory?: string;
  level: CourseLevel;
  type: CourseType;
  language: string;
  
  // Pricing
  price: number;
  discounted_price?: number;
  currency: string;
  is_free: boolean;
  
  // Course Structure
  estimated_duration: number; // in hours
  modules_count: number;
  lessons_count: number;
  quizzes_count: number;
  
  // Requirements
  prerequisites: string[];
  requirements: string[];
  target_audience: string[];
  
  // Learning Outcomes
  learning_objectives: string[];
  skills_gained: string[];
  
  // Certification
  provides_certificate: boolean;
  certificate_template_id?: string;
  ceu_credits?: number; // Continuing Education Units
  accreditation_body?: string;
  
  // Content
  modules: CourseModule[];
  
  // Settings
  enrollment_limit?: number;
  enrollment_deadline?: string;
  access_duration: number; // days after enrollment
  allow_preview: boolean;
  discussion_enabled: boolean;
  
  // Status
  status: CourseStatus;
  published_at?: string;
  
  // Stats
  enrolled_count: number;
  completed_count: number;
  rating: number;
  review_count: number;
  
  // SEO
  seo_title?: string;
  seo_description?: string;
  tags: string[];
  
  created_at: string;
  updated_at: string;
}

// Course Module Interface
export interface CourseModule {
  id: string;
  course_id: string;
  
  title: string;
  description: string;
  order: number;
  
  // Content
  lessons: Lesson[];
  
  // Settings
  is_locked: boolean;
  unlock_condition?: {
    type: 'previous_module' | 'quiz_score' | 'assignment';
    requirement: string;
  };
  
  created_at: string;
  updated_at: string;
}

// Lesson Interface
export interface Lesson {
  id: string;
  module_id: string;
  
  title: string;
  description?: string;
  type: ModuleType;
  order: number;
  
  // Content
  content: {
    video_url?: string;
    video_duration?: number;
    text_content?: string;
    document_url?: string;
    quiz_data?: QuizData;
    assignment_data?: AssignmentData;
    interactive_content?: any;
  };
  
  // Settings
  is_preview: boolean;
  estimated_duration: number; // in minutes
  
  created_at: string;
  updated_at: string;
}

// Quiz Data Interface
export interface QuizData {
  questions: QuizQuestion[];
  passing_score: number;
  time_limit?: number; // in minutes
  attempts_allowed: number;
  randomize_questions: boolean;
  show_correct_answers: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
  question: string;
  options?: string[];
  correct_answer: string | string[];
  explanation?: string;
  points: number;
}

// Assignment Data Interface
export interface AssignmentData {
  instructions: string;
  submission_type: 'file' | 'text' | 'link';
  max_file_size?: number;
  allowed_file_types?: string[];
  due_date?: string;
  rubric?: AssignmentRubric[];
}

export interface AssignmentRubric {
  criteria: string;
  description: string;
  max_points: number;
}

// Course Enrollment Interface
export interface CourseEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at?: string;
  
  // Progress
  progress_percentage: number;
  modules_completed: string[];
  lessons_completed: string[];
  quizzes_completed: string[];
  
  // Scores
  overall_score?: number;
  quiz_scores: {
    [quiz_id: string]: {
      score: number;
      attempts: number;
      completed_at: string;
    };
  };
  
  // Engagement
  total_time_spent: number; // in minutes
  last_accessed: string;
  
  created_at: string;
  updated_at: string;
}

// Certificate Interface
export interface Certificate {
  id: string;
  course_id: string;
  user_id: string;
  
  certificate_number: string;
  issued_date: string;
  expiry_date?: string;
  
  // Details
  recipient_name: string;
  course_title: string;
  instructor_name: string;
  organization_name: string;
  
  // Verification
  verification_code: string;
  is_verified: boolean;
  
  // File
  certificate_url: string;
  
  created_at: string;
}

// LMS Service
export class LMSService {
  // Course Management
  static async createCourse(courseData: Partial<Course>): Promise<Course> {
    const course = await githubDB.insert(collections.courses, {
      ...courseData,
      status: CourseStatus.DRAFT,
      enrolled_count: 0,
      completed_count: 0,
      rating: 0,
      review_count: 0,
      modules_count: 0,
      lessons_count: 0,
      quizzes_count: 0
    });
    
    return course;
  }
  
  static async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    return await githubDB.update(collections.courses, courseId, updates);
  }

  static async deleteCourse(courseId: string): Promise<void> {
    await githubDB.delete(collections.courses, courseId);
  }
  
  static async publishCourse(courseId: string): Promise<Course> {
    const course = await githubDB.update(collections.courses, courseId, {
      status: CourseStatus.PUBLISHED,
      published_at: new Date().toISOString()
    });
    
    // Notify enrolled users
    await this.notifyEnrolledUsers(courseId, 'course_published');
    
    return course;
  }
  
  static async searchCourses(filters: {
    query?: string;
    category?: string;
    level?: CourseLevel;
    type?: CourseType;
    price_min?: number;
    price_max?: number;
    is_free?: boolean;
    provides_certificate?: boolean;
    entity_id?: string;
    rating_min?: number;
  }) {
    let courses = await githubDB.find(collections.courses, {
      status: CourseStatus.PUBLISHED
    });
    
    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      courses = courses.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    
    if (filters.category) {
      courses = courses.filter(course => course.category === filters.category);
    }
    
    if (filters.level) {
      courses = courses.filter(course => course.level === filters.level);
    }
    
    if (filters.type) {
      courses = courses.filter(course => course.type === filters.type);
    }
    
    if (filters.is_free !== undefined) {
      courses = courses.filter(course => course.is_free === filters.is_free);
    }
    
    if (filters.provides_certificate !== undefined) {
      courses = courses.filter(course => course.provides_certificate === filters.provides_certificate);
    }
    
    if (filters.entity_id) {
      courses = courses.filter(course => course.entity_id === filters.entity_id);
    }
    
    if (filters.rating_min) {
      courses = courses.filter(course => course.rating >= filters.rating_min!);
    }
    
    return courses;
  }

  static async getCourse(courseId: string): Promise<Course | null> {
    return await dbHelpers.findById(collections.courses, courseId);
  }
  
  // Module Management
  static async addModule(courseId: string, moduleData: Partial<CourseModule>): Promise<CourseModule> {
    const module = await githubDB.insert(collections.course_modules, {
      ...moduleData,
      course_id: courseId,
      lessons: []
    });
    
    // Update course modules count
    const course = await githubDB.findById(collections.courses, courseId);
    await githubDB.update(collections.courses, courseId, {
      modules_count: course.modules_count + 1
    });
    
    return module;
  }
  
  static async addLesson(moduleId: string, lessonData: Partial<Lesson>): Promise<Lesson> {
    const module = await githubDB.findById(collections.course_modules, moduleId);
    
    const lesson = await githubDB.insert('course_lessons', {
      ...lessonData,
      module_id: moduleId
    });
    
    // Update course lessons count
    const course = await githubDB.findById(collections.courses, module.course_id);
    await githubDB.update(collections.courses, module.course_id, {
      lessons_count: course.lessons_count + 1
    });
    
    return lesson;
  }
  
  // Enrollment Management
  static async enrollUser(courseId: string, userId: string): Promise<CourseEnrollment> {
    // Check if already enrolled
    const existing = await githubDB.find(collections.course_enrollments, {
      course_id: courseId,
      user_id: userId
    });
    
    if (existing.length > 0) {
      throw new Error('User already enrolled in this course');
    }
    
    // Check enrollment limit
    const course = await githubDB.findById(collections.courses, courseId);
    if (course.enrollment_limit && course.enrolled_count >= course.enrollment_limit) {
      throw new Error('Course enrollment limit reached');
    }
    
    // Create enrollment
    const enrollment = await githubDB.insert(collections.course_enrollments, {
      course_id: courseId,
      user_id: userId,
      status: EnrollmentStatus.ACTIVE,
      enrolled_at: new Date().toISOString(),
      progress_percentage: 0,
      modules_completed: [],
      lessons_completed: [],
      quizzes_completed: [],
      quiz_scores: {},
      total_time_spent: 0,
      last_accessed: new Date().toISOString()
    });
    
    // Update course enrollment count
    await githubDB.update(collections.courses, courseId, {
      enrolled_count: course.enrolled_count + 1
    });
    
    return enrollment;
  }
  
  static async updateProgress(
    enrollmentId: string, 
    lessonId: string, 
    timeSpent: number
  ): Promise<CourseEnrollment> {
    const enrollment = await githubDB.findById(collections.course_enrollments, enrollmentId);
    
    // Add lesson to completed if not already
    const lessonsCompleted = [...enrollment.lessons_completed];
    if (!lessonsCompleted.includes(lessonId)) {
      lessonsCompleted.push(lessonId);
    }
    
    // Calculate progress percentage
    const course = await githubDB.findById(collections.courses, enrollment.course_id);
    const progressPercentage = (lessonsCompleted.length / course.lessons_count) * 100;
    
    const updatedEnrollment = await githubDB.update(collections.course_enrollments, enrollmentId, {
      lessons_completed: lessonsCompleted,
      progress_percentage: progressPercentage,
      total_time_spent: enrollment.total_time_spent + timeSpent,
      last_accessed: new Date().toISOString()
    });
    
    // Check if course is completed
    if (progressPercentage >= 100 && enrollment.status === EnrollmentStatus.ACTIVE) {
      await this.completeCourse(enrollmentId);
    }
    
    return updatedEnrollment;
  }
  
  static async submitQuiz(
    enrollmentId: string, 
    quizId: string, 
    answers: any[]
  ): Promise<{ score: number; passed: boolean }> {
    const enrollment = await githubDB.findById(collections.course_enrollments, enrollmentId);
    
    // Get quiz data
    const quiz = await githubDB.findById('course_quizzes', quizId);
    
    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;
    
    quiz.questions.forEach((question: QuizQuestion, index: number) => {
      totalPoints += question.points;
      
      const userAnswer = answers[index];
      if (this.isCorrectAnswer(question, userAnswer)) {
        earnedPoints += question.points;
      }
    });
    
    const score = (earnedPoints / totalPoints) * 100;
    const passed = score >= quiz.passing_score;
    
    // Update enrollment
    const quizScores = { ...enrollment.quiz_scores };
    quizScores[quizId] = {
      score,
      attempts: (quizScores[quizId]?.attempts || 0) + 1,
      completed_at: new Date().toISOString()
    };
    
    const quizzesCompleted = [...enrollment.quizzes_completed];
    if (passed && !quizzesCompleted.includes(quizId)) {
      quizzesCompleted.push(quizId);
    }
    
    await githubDB.update(collections.course_enrollments, enrollmentId, {
      quiz_scores: quizScores,
      quizzes_completed
    });
    
    return { score, passed };
  }
  
  static async completeCourse(enrollmentId: string): Promise<void> {
    const enrollment = await githubDB.findById(collections.course_enrollments, enrollmentId);
    const course = await githubDB.findById(collections.courses, enrollment.course_id);
    
    // Update enrollment status
    await githubDB.update(collections.course_enrollments, enrollmentId, {
      status: EnrollmentStatus.COMPLETED,
      completed_at: new Date().toISOString()
    });
    
    // Update course completed count
    await githubDB.update(collections.courses, enrollment.course_id, {
      completed_count: course.completed_count + 1
    });
    
    // Generate certificate if applicable
    if (course.provides_certificate) {
      await this.generateCertificate(enrollment.course_id, enrollment.user_id);
    }
  }
  
  // Certificate Management
  static async generateCertificate(courseId: string, userId: string): Promise<Certificate> {
    const course = await githubDB.findById(collections.courses, courseId);
    const user = await githubDB.findById(collections.users, userId);
    const profile = await githubDB.find(collections.profiles, { user_id: userId });
    const userProfile = profile[0];
    
    const certificateNumber = `CC-${course.id.slice(-6)}-${userId.slice(-6)}-${Date.now()}`;
    const verificationCode = this.generateVerificationCode();
    
    const certificate = await githubDB.insert(collections.certificates, {
      course_id: courseId,
      user_id: userId,
      certificate_number: certificateNumber,
      issued_date: new Date().toISOString(),
      expiry_date: course.ceu_credits ? this.calculateExpiryDate() : undefined,
      recipient_name: `${userProfile.first_name} ${userProfile.last_name}`,
      course_title: course.title,
      instructor_name: 'Healthcare Professional', // Get from instructor profile
      organization_name: 'CareConnect Healthcare Platform',
      verification_code: verificationCode,
      is_verified: true,
      certificate_url: `https://certificates.careconnect.com/${certificateNumber}.pdf`
    });
    
    // Send certificate notification
    await githubDB.insert(collections.notifications, {
      user_id: userId,
      type: 'certificate_issued',
      title: 'Certificate Earned!',
      message: `Congratulations! You've earned a certificate for completing ${course.title}.`,
      data: { certificate_id: certificate.id },
      is_read: false
    });
    
    return certificate;
  }
  
  static async verifyCertificate(verificationCode: string): Promise<Certificate | null> {
    const certificates = await githubDB.find(collections.certificates, {
      verification_code: verificationCode,
      is_verified: true
    });
    
    return certificates.length > 0 ? certificates[0] : null;
  }
  
  // Helper Functions
  private static isCorrectAnswer(question: QuizQuestion, userAnswer: any): boolean {
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        return question.correct_answer === userAnswer;
      
      case 'fill_blank':
        if (Array.isArray(question.correct_answer)) {
          return question.correct_answer.some(answer => 
            answer.toLowerCase() === userAnswer.toLowerCase()
          );
        }
        return question.correct_answer.toLowerCase() === userAnswer.toLowerCase();
      
      case 'essay':
        // Essay questions need manual grading
        return false;
      
      default:
        return false;
    }
  }
  
  private static generateVerificationCode(): string {
    return Math.random().toString(36).substr(2, 12).toUpperCase();
  }
  
  private static calculateExpiryDate(): string {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2 years validity
    return expiryDate.toISOString();
  }
  
  private static async notifyEnrolledUsers(courseId: string, type: string) {
    const enrollments = await githubDB.find(collections.course_enrollments, {
      course_id: courseId,
      status: EnrollmentStatus.ACTIVE
    });
    
    const course = await githubDB.findById(collections.courses, courseId);
    
    for (const enrollment of enrollments) {
      await githubDB.insert(collections.notifications, {
        user_id: enrollment.user_id,
        type,
        title: 'Course Update',
        message: `The course "${course.title}" has been updated.`,
        data: { course_id: courseId },
        is_read: false
      });
    }
  }
  
  // Analytics
  static async getCourseAnalytics(courseId: string) {
    const enrollments = await githubDB.find(collections.course_enrollments, { course_id: courseId });
    
    const analytics = {
      total_enrollments: enrollments.length,
      active_enrollments: enrollments.filter(e => e.status === EnrollmentStatus.ACTIVE).length,
      completed_enrollments: enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length,
      average_progress: enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length || 0,
      average_time_spent: enrollments.reduce((sum, e) => sum + e.total_time_spent, 0) / enrollments.length || 0,
      completion_rate: enrollments.length > 0 ? 
        (enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length / enrollments.length) * 100 : 0
    };
    
    return analytics;
  }
}

// Course Categories
export const COURSE_CATEGORIES = [
  'Medical Fundamentals',
  'Clinical Skills',
  'Patient Care',
  'Healthcare Technology',
  'Medical Ethics',
  'Healthcare Administration',
  'Emergency Medicine',
  'Preventive Care',
  'Mental Health',
  'Chronic Disease Management',
  'Pediatric Care',
  'Geriatric Care',
  'Women\'s Health',
  'Men\'s Health',
  'Nutrition and Wellness',
  'Pharmacy Practice',
  'Medical Research',
  'Healthcare Quality',
  'Patient Safety',
  'Continuing Education'
];

// Comprehensive Starter Courses with Rich Content
export const STARTER_COURSES: Course[] = [
  {
    id: 'course-fundamentals-anatomy',
    entity_id: 'entity-careconnect',
    instructor_id: 'instructor-dr-smith',
    title: 'Human Anatomy Fundamentals',
    description: 'Comprehensive introduction to human anatomy covering all major body systems. This course provides a thorough understanding of anatomical structures, physiological functions, and their clinical significance. Perfect for healthcare students, professionals, and anyone interested in understanding the human body.',
    short_description: 'Master the fundamentals of human anatomy with interactive lessons, 3D visualizations, and clinical applications.',
    thumbnail_url: '/images/courses/anatomy-fundamentals.jpg',
    banner_url: '/images/courses/anatomy-banner.jpg',
    category: 'Medical Fundamentals',
    subcategory: 'Human Anatomy',
    level: CourseLevel.BEGINNER,
    type: CourseType.SELF_PACED,
    language: 'English',
    price: 199,
    discounted_price: 149,
    currency: 'USD',
    is_free: false,
    estimated_duration: 40,
    modules_count: 8,
    lessons_count: 32,
    quizzes_count: 8,
    prerequisites: ['Basic biology knowledge', 'Medical terminology basics'],
    requirements: ['Computer with internet access', 'Notebook for taking notes'],
    target_audience: ['Pre-med students', 'Nursing students', 'Healthcare professionals', 'Medical assistants'],
    learning_objectives: [
      'Identify and describe major anatomical structures',
      'Understand the relationship between structure and function',
      'Apply anatomical knowledge to clinical scenarios',
      'Use proper medical terminology for anatomical descriptions'
    ],
    skills_gained: [
      'Anatomical knowledge',
      'Medical terminology',
      'Clinical reasoning',
      'Visual-spatial understanding'
    ],
    provides_certificate: true,
    certificate_template_id: 'cert-template-anatomy',
    ceu_credits: 20,
    accreditation_body: 'American Medical Education Association',
    modules: [
      {
        id: 'module-intro-anatomy',
        course_id: 'course-fundamentals-anatomy',
        title: 'Introduction to Human Anatomy',
        description: 'Overview of anatomical terminology, body systems, and basic structures',
        order: 1,
        lessons: [
          {
            id: 'lesson-anatomical-position',
            module_id: 'module-intro-anatomy',
            title: 'Anatomical Position and Terminology',
            description: 'Learn the standard anatomical position and directional terms',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/anatomical-position.mp4',
              video_duration: 15,
              text_content: 'The anatomical position is the standard reference position used in anatomy...'
            },
            is_preview: true,
            estimated_duration: 20,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-body-planes',
            module_id: 'module-intro-anatomy',
            title: 'Body Planes and Sections',
            description: 'Understanding sagittal, coronal, and transverse planes',
            type: ModuleType.INTERACTIVE,
            order: 2,
            content: {
              interactive_content: {
                type: '3d_model',
                model_url: '/models/body-planes.obj',
                controls: ['rotate', 'zoom', 'section']
              }
            },
            is_preview: false,
            estimated_duration: 25,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'module-skeletal-system',
        course_id: 'course-fundamentals-anatomy',
        title: 'The Skeletal System',
        description: 'Comprehensive study of bones, joints, and skeletal structure',
        order: 2,
        lessons: [
          {
            id: 'lesson-bone-structure',
            module_id: 'module-skeletal-system',
            title: 'Bone Structure and Function',
            description: 'Understanding bone composition, types, and functions',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/bone-structure.mp4',
              video_duration: 20,
              text_content: 'Bones are living tissues composed of collagen and calcium phosphate...'
            },
            is_preview: false,
            estimated_duration: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    enrollment_limit: 500,
    enrollment_deadline: '2025-12-31',
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    status: CourseStatus.PUBLISHED,
    published_at: '2025-01-01T00:00:00Z',
    enrolled_count: 247,
    completed_count: 189,
    rating: 4.8,
    review_count: 156,
    seo_title: 'Human Anatomy Fundamentals - Complete Online Course',
    seo_description: 'Master human anatomy with our comprehensive online course featuring interactive 3D models, expert instruction, and certification.',
    tags: ['anatomy', 'medical', 'healthcare', 'education', 'fundamentals'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z'
  },
  {
    id: 'course-patient-care-basics',
    entity_id: 'entity-careconnect',
    instructor_id: 'instructor-nurse-johnson',
    title: 'Patient Care Fundamentals',
    description: 'Essential skills for providing compassionate, effective patient care. This comprehensive course covers communication techniques, basic nursing skills, patient safety protocols, and ethical considerations in healthcare. Designed for healthcare professionals at all levels.',
    short_description: 'Learn essential patient care skills including communication, safety protocols, and ethical practices.',
    thumbnail_url: '/images/courses/patient-care.jpg',
    banner_url: '/images/courses/patient-care-banner.jpg',
    category: 'Patient Care',
    subcategory: 'Nursing Fundamentals',
    level: CourseLevel.BEGINNER,
    type: CourseType.SELF_PACED,
    language: 'English',
    price: 0,
    currency: 'USD',
    is_free: true,
    estimated_duration: 25,
    modules_count: 5,
    lessons_count: 20,
    quizzes_count: 5,
    prerequisites: [],
    requirements: ['Interest in healthcare', 'Basic English proficiency'],
    target_audience: ['New healthcare workers', 'Nursing students', 'Healthcare volunteers', 'Family caregivers'],
    learning_objectives: [
      'Demonstrate effective communication with patients and families',
      'Apply basic patient safety principles',
      'Understand ethical considerations in patient care',
      'Perform basic patient care techniques'
    ],
    skills_gained: [
      'Patient communication',
      'Safety protocols',
      'Ethical decision making',
      'Basic care techniques'
    ],
    provides_certificate: true,
    certificate_template_id: 'cert-template-patient-care',
    ceu_credits: 15,
    modules: [
      {
        id: 'module-communication',
        course_id: 'course-patient-care-basics',
        title: 'Effective Patient Communication',
        description: 'Learn techniques for clear, compassionate communication with patients and families',
        order: 1,
        lessons: [
          {
            id: 'lesson-active-listening',
            module_id: 'module-communication',
            title: 'Active Listening Techniques',
            description: 'Master the art of active listening in healthcare settings',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/active-listening.mp4',
              video_duration: 12,
              text_content: 'Active listening is a crucial skill that involves fully concentrating on what the patient is saying...'
            },
            is_preview: true,
            estimated_duration: 18,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-difficult-conversations',
            module_id: 'module-communication',
            title: 'Handling Difficult Conversations',
            description: 'Strategies for managing challenging patient interactions',
            type: ModuleType.TEXT,
            order: 2,
            content: {
              text_content: 'Difficult conversations in healthcare are inevitable. This lesson provides frameworks and techniques for managing these situations with empathy and professionalism...'
            },
            is_preview: false,
            estimated_duration: 22,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    enrollment_limit: 1000,
    access_duration: 180,
    allow_preview: true,
    discussion_enabled: true,
    status: CourseStatus.PUBLISHED,
    published_at: '2025-01-01T00:00:00Z',
    enrolled_count: 892,
    completed_count: 734,
    rating: 4.9,
    review_count: 445,
    seo_title: 'Patient Care Fundamentals - Free Healthcare Course',
    seo_description: 'Learn essential patient care skills with our free comprehensive course. Perfect for healthcare professionals and students.',
    tags: ['patient care', 'nursing', 'communication', 'healthcare', 'free course'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z'
  },
  {
    id: 'course-mental-health-first-aid',
    entity_id: 'entity-careconnect',
    instructor_id: 'instructor-dr-martinez',
    title: 'Mental Health First Aid Certification',
    description: 'Comprehensive training in mental health first aid techniques. Learn to recognize signs of mental health crises, provide initial support, and connect individuals with appropriate professional help. This course meets national certification standards.',
    short_description: 'Get certified in mental health first aid and learn to support people in mental health crises.',
    thumbnail_url: '/images/courses/mental-health.jpg',
    banner_url: '/images/courses/mental-health-banner.jpg',
    category: 'Mental Health',
    subcategory: 'Crisis Intervention',
    level: CourseLevel.INTERMEDIATE,
    type: CourseType.CERTIFICATION,
    language: 'English',
    price: 299,
    discounted_price: 249,
    currency: 'USD',
    is_free: false,
    estimated_duration: 30,
    modules_count: 6,
    lessons_count: 24,
    quizzes_count: 6,
    prerequisites: ['Must be 18 years or older', 'Basic understanding of mental health concepts'],
    requirements: ['Stable internet connection', 'Ability to complete practical exercises'],
    target_audience: ['Healthcare workers', 'Teachers', 'Community leaders', 'HR professionals'],
    learning_objectives: [
      'Identify signs and symptoms of mental health challenges',
      'Apply the Mental Health First Aid Action Plan',
      'Provide appropriate initial support and comfort',
      'Connect individuals with professional help and resources'
    ],
    skills_gained: [
      'Crisis recognition',
      'De-escalation techniques',
      'Resource awareness',
      'Supportive communication'
    ],
    provides_certificate: true,
    certificate_template_id: 'cert-template-mhfa',
    ceu_credits: 25,
    accreditation_body: 'National Mental Health First Aid Council',
    modules: [
      {
        id: 'module-introduction-mhfa',
        course_id: 'course-mental-health-first-aid',
        title: 'Introduction to Mental Health First Aid',
        description: 'Overview of mental health first aid principles and the ALGEE action plan',
        order: 1,
        lessons: [
          {
            id: 'lesson-mhfa-overview',
            module_id: 'module-introduction-mhfa',
            title: 'What is Mental Health First Aid?',
            description: 'Understanding the role and importance of mental health first aid',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/mhfa-overview.mp4',
              video_duration: 18,
              text_content: 'Mental Health First Aid is the initial support provided to a person experiencing a mental health challenge or crisis...'
            },
            is_preview: true,
            estimated_duration: 25,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    enrollment_limit: 200,
    enrollment_deadline: '2025-12-15',
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    status: CourseStatus.PUBLISHED,
    published_at: '2025-01-01T00:00:00Z',
    enrolled_count: 156,
    completed_count: 98,
    rating: 4.7,
    review_count: 78,
    seo_title: 'Mental Health First Aid Certification Course',
    seo_description: 'Get certified in Mental Health First Aid with our comprehensive online course. Nationally recognized certification.',
    tags: ['mental health', 'first aid', 'certification', 'crisis intervention', 'healthcare'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-12T00:00:00Z'
  },
  {
    id: 'course-healthcare-technology',
    entity_id: 'entity-careconnect',
    instructor_id: 'instructor-tech-chen',
    title: 'Healthcare Technology Essentials',
    description: 'Explore the latest healthcare technologies including Electronic Health Records (EHR), telemedicine platforms, medical imaging systems, and AI applications in healthcare. Learn how technology is transforming patient care and healthcare delivery.',
    short_description: 'Discover how technology is revolutionizing healthcare with hands-on experience in modern healthcare systems.',
    thumbnail_url: '/images/courses/healthcare-tech.jpg',
    banner_url: '/images/courses/healthcare-tech-banner.jpg',
    category: 'Healthcare Technology',
    subcategory: 'Digital Health',
    level: CourseLevel.INTERMEDIATE,
    type: CourseType.HYBRID,
    language: 'English',
    price: 399,
    discounted_price: 299,
    currency: 'USD',
    is_free: false,
    estimated_duration: 35,
    modules_count: 7,
    lessons_count: 28,
    quizzes_count: 7,
    prerequisites: ['Basic computer skills', 'Healthcare industry knowledge'],
    requirements: ['Computer with internet access', 'Access to practice systems (provided)'],
    target_audience: ['Healthcare administrators', 'IT professionals in healthcare', 'Healthcare providers', 'Students in health informatics'],
    learning_objectives: [
      'Navigate and utilize Electronic Health Record systems',
      'Understand telemedicine platforms and best practices',
      'Evaluate healthcare AI and automation tools',
      'Implement technology solutions for improved patient care'
    ],
    skills_gained: [
      'EHR proficiency',
      'Telemedicine skills',
      'Health informatics knowledge',
      'Technology assessment'
    ],
    provides_certificate: true,
    certificate_template_id: 'cert-template-health-tech',
    ceu_credits: 30,
    accreditation_body: 'Healthcare Information Management Systems Society',
    modules: [
      {
        id: 'module-ehr-systems',
        course_id: 'course-healthcare-technology',
        title: 'Electronic Health Records (EHR)',
        description: 'Comprehensive training on EHR systems, data entry, and clinical workflows',
        order: 1,
        lessons: [
          {
            id: 'lesson-ehr-basics',
            module_id: 'module-ehr-systems',
            title: 'EHR System Fundamentals',
            description: 'Introduction to EHR systems, benefits, and basic navigation',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/ehr-fundamentals.mp4',
              video_duration: 22,
              text_content: 'Electronic Health Records have transformed healthcare documentation and patient care coordination...'
            },
            is_preview: true,
            estimated_duration: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    enrollment_limit: 300,
    enrollment_deadline: '2025-11-30',
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    status: CourseStatus.PUBLISHED,
    published_at: '2025-01-01T00:00:00Z',
    enrolled_count: 198,
    completed_count: 142,
    rating: 4.6,
    review_count: 89,
    seo_title: 'Healthcare Technology Essentials - EHR and Digital Health',
    seo_description: 'Master healthcare technology with our comprehensive course covering EHR systems, telemedicine, and AI in healthcare.',
    tags: ['healthcare technology', 'EHR', 'telemedicine', 'health informatics', 'digital health'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-08T00:00:00Z'
  }
];

// Course Creation Helper
export class CourseBuilder {
  private course: Partial<Course> = {};

  constructor() {
    this.course = {
      status: CourseStatus.DRAFT,
      enrolled_count: 0,
      completed_count: 0,
      rating: 0,
      review_count: 0,
      modules_count: 0,
      lessons_count: 0,
      quizzes_count: 0,
      modules: [],
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  setBasicInfo(info: {
    title: string;
    description: string;
    short_description: string;
    category: string;
    level: CourseLevel;
    type: CourseType;
  }) {
    Object.assign(this.course, info);
    return this;
  }

  setPricing(pricing: {
    price: number;
    discounted_price?: number;
    currency: string;
    is_free: boolean;
  }) {
    Object.assign(this.course, pricing);
    return this;
  }

  addModule(module: Partial<CourseModule>) {
    if (!this.course.modules) {
      this.course.modules = [];
    }
    this.course.modules.push(module as CourseModule);
    this.course.modules_count = (this.course.modules_count || 0) + 1;
    return this;
  }

  addLesson(moduleId: string, lesson: Partial<Lesson>) {
    const module = this.course.modules?.find(m => m.id === moduleId);
    if (module) {
      if (!module.lessons) {
        module.lessons = [];
      }
      module.lessons.push(lesson as Lesson);
      this.course.lessons_count = (this.course.lessons_count || 0) + 1;
    }
    return this;
  }

  addQuiz(moduleId: string, lessonId: string, quiz: QuizData) {
    const module = this.course.modules?.find(m => m.id === moduleId);
    const lesson = module?.lessons?.find(l => l.id === lessonId);
    if (lesson) {
      lesson.content.quiz_data = quiz;
      this.course.quizzes_count = (this.course.quizzes_count || 0) + 1;
    }
    return this;
  }

  build(): Partial<Course> {
    return { ...this.course };
  }
}

// Initialize starter courses in database
export const initializeStarterCourses = async () => {
  try {
    for (const course of STARTER_COURSES) {
      await dbHelpers.create(collections.courses, course);
    }
    console.log('Starter courses initialized successfully');
  } catch (error) {
    console.error('Error initializing starter courses:', error);
  }
};
