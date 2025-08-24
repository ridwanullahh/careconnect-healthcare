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
    const course = await githubDB.findById<Course>(collections.courses, courseId);
    if (!course) return null;

    // Manually populate modules and lessons for the course
    const modules = await githubDB.find<CourseModule>(collections.course_modules, { course_id: courseId });
    for (const module of modules) {
      module.lessons = await githubDB.find<Lesson>(collections.course_lessons, { module_id: module.id });
    }
    course.modules = modules;

    return course;
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

// Comprehensive Production-Ready Courses with Rich Content
export const PRODUCTION_COURSES: Course[] = [
  {
    id: 'course-healthcare-communication',
    entity_id: 'entity-careconnect',
    instructor_id: 'instructor-dr-communication',
    title: 'Healthcare Communication Essentials',
    description: 'Master the art of effective communication in healthcare settings. This comprehensive course covers patient communication, interdisciplinary collaboration, difficult conversations, cultural competency, and digital communication tools. Learn evidence-based strategies to improve patient outcomes through better communication.',
    short_description: 'Essential communication skills for healthcare professionals to enhance patient care and team collaboration.',
    thumbnail_url: '/images/courses/healthcare-communication.jpg',
    banner_url: '/images/courses/healthcare-communication-banner.jpg',
    category: 'Patient Care',
    subcategory: 'Communication Skills',
    level: CourseLevel.BEGINNER,
    type: CourseType.SELF_PACED,
    language: 'English',
    price: 149,
    discounted_price: 99,
    currency: 'USD',
    is_free: false,
    estimated_duration: 25,
    modules_count: 8,
    lessons_count: 32,
    quizzes_count: 8,
    prerequisites: ['Basic healthcare knowledge', 'Interest in patient care'],
    requirements: ['Computer with internet access', 'Notebook for practice exercises'],
    target_audience: ['Healthcare professionals', 'Nursing students', 'Medical students', 'Healthcare administrators'],
    learning_objectives: [
      'Demonstrate effective patient communication techniques',
      'Handle difficult conversations with empathy and professionalism',
      'Apply cultural competency in diverse healthcare settings',
      'Utilize digital communication tools effectively',
      'Collaborate effectively with interdisciplinary teams',
      'Implement evidence-based communication strategies'
    ],
    skills_gained: [
      'Active listening',
      'Empathetic communication',
      'Conflict resolution',
      'Cultural competency',
      'Digital communication',
      'Team collaboration'
    ],
    provides_certificate: true,
    certificate_template_id: 'cert-template-communication',
    ceu_credits: 15,
    accreditation_body: 'Healthcare Communication Institute',
    modules: [
      {
        id: 'module-communication-fundamentals',
        course_id: 'course-healthcare-communication',
        title: 'Communication Fundamentals in Healthcare',
        description: 'Core principles of effective healthcare communication',
        order: 1,
        lessons: [
          {
            id: 'lesson-communication-principles',
            module_id: 'module-communication-fundamentals',
            title: 'Principles of Effective Healthcare Communication',
            description: 'Understanding the foundation of good communication in healthcare',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/communication-principles.mp4',
              video_duration: 18,
              text_content: 'Effective healthcare communication is built on trust, respect, and clear understanding. This lesson explores the fundamental principles that guide all successful healthcare interactions...'
            },
            is_preview: true,
            estimated_duration: 25,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-active-listening-skills',
            module_id: 'module-communication-fundamentals',
            title: 'Active Listening Skills',
            description: 'Developing advanced listening skills for better patient understanding',
            type: ModuleType.TEXT,
            order: 2,
            content: {
              text_content: 'Active listening is more than just hearing words. It involves fully concentrating on what the patient is saying, understanding their message, and responding thoughtfully. This lesson provides practical techniques for improving your listening skills...'
            },
            is_preview: false,
            estimated_duration: 20,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-nonverbal-communication',
            module_id: 'module-communication-fundamentals',
            title: 'Nonverbal Communication in Healthcare',
            description: 'Understanding body language, facial expressions, and tone',
            type: ModuleType.VIDEO,
            order: 3,
            content: {
              video_url: '/videos/nonverbal-communication.mp4',
              video_duration: 22,
              text_content: 'Research shows that 55% of communication is body language, 38% is tone of voice, and only 7% is actual words. In healthcare, nonverbal communication can significantly impact patient trust and comfort...'
            },
            is_preview: false,
            estimated_duration: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'quiz-communication-fundamentals',
            module_id: 'module-communication-fundamentals',
            title: 'Communication Fundamentals Quiz',
            description: 'Test your understanding of basic communication principles',
            type: ModuleType.QUIZ,
            order: 4,
            content: {
              quiz_data: {
                questions: [
                  {
                    id: 'q1-comm-fund',
                    type: 'multiple_choice',
                    question: 'What percentage of communication is attributed to body language according to research?',
                    options: ['7%', '38%', '55%', '93%'],
                    correct_answer: '55%',
                    explanation: 'According to Albert Mehrabian\'s research, 55% of communication is body language, 38% is tone of voice, and 7% is words.',
                    points: 10
                  },
                  {
                    id: 'q2-comm-fund',
                    type: 'true_false',
                    question: 'Active listening only involves hearing what the patient says.',
                    options: ['True', 'False'],
                    correct_answer: 'False',
                    explanation: 'Active listening involves fully concentrating, understanding, and responding thoughtfully, not just hearing.',
                    points: 10
                  }
                ],
                passing_score: 70,
                time_limit: 10,
                attempts_allowed: 3,
                randomize_questions: false,
                show_correct_answers: true
              }
            },
            is_preview: false,
            estimated_duration: 15,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'module-patient-communication',
        course_id: 'course-healthcare-communication',
        title: 'Patient Communication Strategies',
        description: 'Effective techniques for communicating with patients and families',
        order: 2,
        lessons: [
          {
            id: 'lesson-patient-interviews',
            module_id: 'module-patient-communication',
            title: 'Conducting Effective Patient Interviews',
            description: 'Structured approaches to gathering patient information',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/patient-interviews.mp4',
              video_duration: 25,
              text_content: 'A well-conducted patient interview is the foundation of quality healthcare. This lesson covers structured interview techniques, open-ended questioning, and creating a comfortable environment for patients to share their concerns...'
            },
            is_preview: false,
            estimated_duration: 35,
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
    enrollment_deadline: '2025-12-31',
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    status: CourseStatus.PUBLISHED,
    published_at: '2025-01-01T00:00:00Z',
    enrolled_count: 189,
    completed_count: 142,
    rating: 4.9,
    review_count: 98,
    seo_title: 'Healthcare Communication Essentials - Professional Development Course',
    seo_description: 'Master essential communication skills for healthcare professionals. Learn patient communication, team collaboration, and cultural competency.',
    tags: ['communication', 'patient care', 'healthcare', 'professional development', 'soft skills'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z'
  },
  {
    id: 'course-medical-ethics',
    entity_id: 'entity-careconnect',
    instructor_id: 'instructor-dr-ethics',
    title: 'Medical Ethics and Patient Care',
    description: 'Explore the fundamental principles of medical ethics and their application in modern healthcare. This course covers bioethical principles, informed consent, end-of-life care, research ethics, and contemporary ethical dilemmas in medicine. Develop critical thinking skills to navigate complex ethical situations in healthcare practice.',
    short_description: 'Master medical ethics principles and apply them to real-world healthcare scenarios and decision-making.',
    thumbnail_url: '/images/courses/medical-ethics.jpg',
    banner_url: '/images/courses/medical-ethics-banner.jpg',
    category: 'Medical Ethics',
    subcategory: 'Bioethics',
    level: CourseLevel.INTERMEDIATE,
    type: CourseType.SELF_PACED,
    language: 'English',
    price: 199,
    discounted_price: 149,
    currency: 'USD',
    is_free: false,
    estimated_duration: 30,
    modules_count: 9,
    lessons_count: 36,
    quizzes_count: 9,
    prerequisites: ['Basic healthcare knowledge', 'Understanding of medical terminology'],
    requirements: ['Computer with internet access', 'Notebook for case study analysis'],
    target_audience: ['Healthcare professionals', 'Medical students', 'Nursing students', 'Healthcare administrators', 'Ethics committee members'],
    learning_objectives: [
      'Apply the four principles of biomedical ethics to clinical scenarios',
      'Analyze complex ethical dilemmas using structured frameworks',
      'Understand legal and ethical requirements for informed consent',
      'Navigate end-of-life care decisions with sensitivity and professionalism',
      'Evaluate research ethics and human subjects protection',
      'Develop personal ethical frameworks for professional practice'
    ],
    skills_gained: [
      'Ethical reasoning',
      'Critical thinking',
      'Decision-making frameworks',
      'Professional judgment',
      'Conflict resolution',
      'Legal compliance'
    ],
    provides_certificate: true,
    certificate_template_id: 'cert-template-ethics',
    ceu_credits: 20,
    accreditation_body: 'American Society for Bioethics and Humanities',
    modules: [
      {
        id: 'module-bioethics-principles',
        course_id: 'course-medical-ethics',
        title: 'Fundamental Principles of Bioethics',
        description: 'Explore the four core principles: autonomy, beneficence, non-maleficence, and justice',
        order: 1,
        lessons: [
          {
            id: 'lesson-four-principles',
            module_id: 'module-bioethics-principles',
            title: 'The Four Principles of Biomedical Ethics',
            description: 'Understanding autonomy, beneficence, non-maleficence, and justice',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/four-principles.mp4',
              video_duration: 20,
              text_content: 'The four principles of biomedical ethics, developed by Beauchamp and Childress, provide a framework for analyzing ethical issues in healthcare. These principles are: autonomy (respect for persons), beneficence (doing good), non-maleficence (do no harm), and justice (fairness)...'
            },
            is_preview: true,
            estimated_duration: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-autonomy-practice',
            module_id: 'module-bioethics-principles',
            title: 'Autonomy in Clinical Practice',
            description: 'Respecting patient autonomy and decision-making capacity',
            type: ModuleType.TEXT,
            order: 2,
            content: {
              text_content: 'Patient autonomy is the right of patients to make decisions about their medical care without their healthcare provider trying to influence the decision. This principle requires that healthcare providers respect patients as individuals and honor their right to make choices about their care...'
            },
            is_preview: false,
            estimated_duration: 25,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-beneficence-nonmaleficence',
            module_id: 'module-bioethics-principles',
            title: 'Beneficence and Non-maleficence in Action',
            description: 'Balancing doing good while avoiding harm',
            type: ModuleType.VIDEO,
            order: 3,
            content: {
              video_url: '/videos/beneficence-nonmaleficence.mp4',
              video_duration: 18,
              text_content: 'Beneficence requires healthcare providers to act in the best interest of their patients, while non-maleficence requires them to "do no harm." These principles often work together but can sometimes conflict, requiring careful ethical analysis...'
            },
            is_preview: false,
            estimated_duration: 28,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'quiz-bioethics-principles',
            module_id: 'module-bioethics-principles',
            title: 'Bioethics Principles Assessment',
            description: 'Test your understanding of the four principles',
            type: ModuleType.QUIZ,
            order: 4,
            content: {
              quiz_data: {
                questions: [
                  {
                    id: 'q1-bioethics',
                    type: 'multiple_choice',
                    question: 'Which principle of bioethics emphasizes respect for patient decision-making?',
                    options: ['Beneficence', 'Non-maleficence', 'Autonomy', 'Justice'],
                    correct_answer: 'Autonomy',
                    explanation: 'Autonomy is the principle that emphasizes respect for patients as individuals and their right to make decisions about their care.',
                    points: 10
                  },
                  {
                    id: 'q2-bioethics',
                    type: 'true_false',
                    question: 'Beneficence and non-maleficence never conflict in clinical practice.',
                    options: ['True', 'False'],
                    correct_answer: 'False',
                    explanation: 'These principles can sometimes conflict, such as when a beneficial treatment also carries significant risks.',
                    points: 10
                  }
                ],
                passing_score: 75,
                time_limit: 15,
                attempts_allowed: 3,
                randomize_questions: true,
                show_correct_answers: true
              }
            },
            is_preview: false,
            estimated_duration: 20,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'module-informed-consent',
        course_id: 'course-medical-ethics',
        title: 'Informed Consent and Shared Decision Making',
        description: 'Understanding the legal and ethical requirements for informed consent',
        order: 2,
        lessons: [
          {
            id: 'lesson-consent-elements',
            module_id: 'module-informed-consent',
            title: 'Elements of Valid Informed Consent',
            description: 'The essential components of informed consent process',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/informed-consent.mp4',
              video_duration: 22,
              text_content: 'Valid informed consent requires three essential elements: information (disclosure of relevant information), comprehension (patient understanding), and voluntariness (freedom from coercion). This lesson explores each element in detail...'
            },
            is_preview: false,
            estimated_duration: 32,
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
    enrollment_deadline: '2025-12-31',
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    status: CourseStatus.PUBLISHED,
    published_at: '2025-01-01T00:00:00Z',
    enrolled_count: 156,
    completed_count: 98,
    rating: 4.8,
    review_count: 67,
    seo_title: 'Medical Ethics and Patient Care - Professional Ethics Course',
    seo_description: 'Master medical ethics principles and apply them to real-world healthcare scenarios. Essential for healthcare professionals.',
    tags: ['medical ethics', 'bioethics', 'patient care', 'professional development', 'healthcare'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-12T00:00:00Z'
  },
  {
    id: 'course-healthcare-technology',
    entity_id: 'entity-careconnect',
    instructor_id: 'instructor-tech-specialist',
    title: 'Healthcare Technology and Digital Literacy',
    description: 'Comprehensive training in modern healthcare technology systems and digital tools. This course covers Electronic Health Records (EHR), telemedicine platforms, healthcare apps, data security, artificial intelligence in healthcare, and emerging technologies. Learn to leverage technology to improve patient care and operational efficiency.',
    short_description: 'Master essential healthcare technologies and digital tools to enhance patient care and practice efficiency.',
    thumbnail_url: '/images/courses/healthcare-technology.jpg',
    banner_url: '/images/courses/healthcare-technology-banner.jpg',
    category: 'Healthcare Technology',
    subcategory: 'Digital Health',
    level: CourseLevel.INTERMEDIATE,
    type: CourseType.SELF_PACED,
    language: 'English',
    price: 249,
    discounted_price: 199,
    currency: 'USD',
    is_free: false,
    estimated_duration: 35,
    modules_count: 10,
    lessons_count: 40,
    quizzes_count: 10,
    prerequisites: ['Basic computer skills', 'Healthcare industry knowledge', 'Understanding of healthcare workflows'],
    requirements: ['Computer with internet access', 'Access to practice systems (provided)', 'Notebook for hands-on exercises'],
    target_audience: ['Healthcare administrators', 'IT professionals in healthcare', 'Healthcare providers', 'Students in health informatics', 'Practice managers'],
    learning_objectives: [
      'Navigate and optimize Electronic Health Record systems',
      'Implement telemedicine solutions effectively',
      'Understand healthcare data security and privacy requirements',
      'Evaluate and implement healthcare AI and automation tools',
      'Design digital workflows to improve patient care',
      'Assess emerging technologies for healthcare applications'
    ],
    skills_gained: [
      'EHR proficiency',
      'Telemedicine implementation',
      'Health informatics',
      'Data security compliance',
      'Technology assessment',
      'Digital workflow design'
    ],
    provides_certificate: true,
    certificate_template_id: 'cert-template-health-tech',
    ceu_credits: 25,
    accreditation_body: 'Healthcare Information Management Systems Society',
    modules: [
      {
        id: 'module-ehr-systems',
        course_id: 'course-healthcare-technology',
        title: 'Electronic Health Records (EHR) Mastery',
        description: 'Comprehensive training on EHR systems, optimization, and best practices',
        order: 1,
        lessons: [
          {
            id: 'lesson-ehr-fundamentals',
            module_id: 'module-ehr-systems',
            title: 'EHR System Fundamentals and Benefits',
            description: 'Introduction to EHR systems, benefits, and basic navigation',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/ehr-fundamentals.mp4',
              video_duration: 22,
              text_content: 'Electronic Health Records have transformed healthcare documentation and patient care coordination. This lesson explores the fundamental concepts, benefits, and basic navigation of modern EHR systems...'
            },
            is_preview: true,
            estimated_duration: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-ehr-data-entry',
            module_id: 'module-ehr-systems',
            title: 'Efficient Data Entry and Documentation',
            description: 'Best practices for accurate and efficient EHR documentation',
            type: ModuleType.TEXT,
            order: 2,
            content: {
              text_content: 'Efficient data entry in EHR systems is crucial for maintaining accurate patient records while optimizing workflow. This lesson covers templates, shortcuts, voice recognition, and structured data entry techniques...'
            },
            is_preview: false,
            estimated_duration: 25,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'lesson-ehr-interoperability',
            module_id: 'module-ehr-systems',
            title: 'EHR Interoperability and Data Exchange',
            description: 'Understanding how EHR systems communicate and share data',
            type: ModuleType.VIDEO,
            order: 3,
            content: {
              video_url: '/videos/ehr-interoperability.mp4',
              video_duration: 20,
              text_content: 'Interoperability allows different EHR systems to communicate and exchange patient data seamlessly. This lesson covers HL7 standards, FHIR protocols, and practical implementation strategies...'
            },
            is_preview: false,
            estimated_duration: 28,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'quiz-ehr-systems',
            module_id: 'module-ehr-systems',
            title: 'EHR Systems Knowledge Check',
            description: 'Test your understanding of EHR fundamentals and best practices',
            type: ModuleType.QUIZ,
            order: 4,
            content: {
              quiz_data: {
                questions: [
                  {
                    id: 'q1-ehr',
                    type: 'multiple_choice',
                    question: 'What is the primary benefit of EHR interoperability?',
                    options: ['Reduced costs', 'Seamless data exchange between systems', 'Faster data entry', 'Better user interface'],
                    correct_answer: 'Seamless data exchange between systems',
                    explanation: 'Interoperability allows different EHR systems to communicate and share patient data, improving care coordination.',
                    points: 10
                  },
                  {
                    id: 'q2-ehr',
                    type: 'true_false',
                    question: 'HL7 FHIR is a standard for healthcare data exchange.',
                    options: ['True', 'False'],
                    correct_answer: 'True',
                    explanation: 'HL7 FHIR (Fast Healthcare Interoperability Resources) is indeed a standard for exchanging healthcare information electronically.',
                    points: 10
                  }
                ],
                passing_score: 80,
                time_limit: 12,
                attempts_allowed: 3,
                randomize_questions: true,
                show_correct_answers: true
              }
            },
            is_preview: false,
            estimated_duration: 18,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'module-telemedicine',
        course_id: 'course-healthcare-technology',
        title: 'Telemedicine and Remote Care Technologies',
        description: 'Implementation and optimization of telemedicine solutions',
        order: 2,
        lessons: [
          {
            id: 'lesson-telemedicine-platforms',
            module_id: 'module-telemedicine',
            title: 'Telemedicine Platform Selection and Setup',
            description: 'Choosing and implementing the right telemedicine solution',
            type: ModuleType.VIDEO,
            order: 1,
            content: {
              video_url: '/videos/telemedicine-platforms.mp4',
              video_duration: 25,
              text_content: 'Selecting the right telemedicine platform is crucial for successful remote care delivery. This lesson covers platform evaluation criteria, implementation strategies, and best practices for virtual consultations...'
            },
            is_preview: false,
            estimated_duration: 35,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    enrollment_limit: 150,
    enrollment_deadline: '2025-12-31',
    access_duration: 365,
    allow_preview: true,
    discussion_enabled: true,
    status: CourseStatus.PUBLISHED,
    published_at: '2025-01-01T00:00:00Z',
    enrolled_count: 124,
    completed_count: 89,
    rating: 4.7,
    review_count: 56,
    seo_title: 'Healthcare Technology and Digital Literacy - Professional Development',
    seo_description: 'Master healthcare technology systems including EHR, telemedicine, and emerging digital health tools. Essential for modern healthcare professionals.',
    tags: ['healthcare technology', 'EHR', 'telemedicine', 'digital health', 'health informatics', 'professional development'],
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

// Initialize production courses in database
export const initializeProductionCourses = async () => {
  try {
    for (const course of PRODUCTION_COURSES) {
      // Separate modules and lessons from the main course object
      const { modules, ...courseData } = course;
      
      // Create the course document
      const newCourse = await githubDB.insert(collections.courses, courseData);

      if (modules) {
        for (const module of modules) {
          const { lessons, ...moduleData } = module;
          moduleData.course_id = newCourse.id;
          
          // Create the module document
          const newModule = await githubDB.insert(collections.course_modules, moduleData);

          if (lessons) {
            for (const lesson of lessons) {
              const lessonData = { ...lesson, module_id: newModule.id };
              // Create the lesson document
              await githubDB.insert(collections.course_lessons, lessonData);
            }
          }
        }
      }
    }
    console.log('Production courses initialized successfully');
  } catch (error) {
    console.error('Error initializing production courses:', error);
  }
};
