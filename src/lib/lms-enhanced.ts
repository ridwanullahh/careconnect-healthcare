// Enhanced Learning Management System
import { githubDB, collections } from './database';
import PaymentService from './payments-enhanced';

export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  instructorId: string;
  instructorName: string;
  price: number;
  currency: string;
  duration: number; // in hours
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  tags: string[];
  modules: CourseModule[];
  requirements: string[];
  learningOutcomes: string[];
  certificateTemplate: string;
  isPublished: boolean;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
  quiz?: ModuleQuiz;
  estimatedDuration: number;
  isRequired: boolean;
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  videoUrl?: string;
  audioUrl?: string;
  attachments: LessonAttachment[];
  order: number;
  estimatedDuration: number;
  isRequired: boolean;
}

export interface LessonAttachment {
  id: string;
  name: string;
  url: string;
  type: 'pdf' | 'doc' | 'image' | 'link' | 'other';
  size?: number;
}

export interface ModuleQuiz {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number;
  allowedAttempts: number;
  timeLimit?: number; // in minutes
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'text' | 'essay';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  status: 'pending_payment' | 'pending_review' | 'active' | 'completed' | 'cancelled' | 'expired';
  paymentIntentId?: string;
  enrolledAt: string;
  activatedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  progress: CourseProgress;
  certificateId?: string;
}

export interface CourseProgress {
  completedLessons: string[];
  completedModules: string[];
  quizScores: Record<string, QuizAttempt[]>;
  overallProgress: number; // percentage
  timeSpent: number; // in minutes
  lastAccessedAt: string;
}

export interface QuizAttempt {
  attemptNumber: number;
  answers: Record<string, any>;
  score: number;
  totalPoints: number;
  passed: boolean;
  completedAt: string;
  timeSpent: number;
}

export interface Certificate {
  id: string;
  courseId: string;
  userId: string;
  enrollmentId: string;
  certificateNumber: string;
  issuedAt: string;
  recipientName: string;
  courseTitle: string;
  instructorName: string;
  completionDate: string;
  htmlContent: string;
  metadata: Record<string, any>;
}

export class LMSService {
  // Create course
  static async createCourse(courseData: Omit<Course, 'id' | 'enrollmentCount' | 'rating' | 'reviewCount' | 'createdAt' | 'updatedAt'>): Promise<Course> {
    const course: Course = {
      id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...courseData,
      enrollmentCount: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.courses, course);
    return course;
  }

  // Update course
  static async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
    const course = await githubDB.findById(collections.courses, courseId);
    if (!course) throw new Error('Course not found');

    const updatedCourse = {
      ...course,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await githubDB.update(collections.courses, courseId, updatedCourse);
    return updatedCourse;
  }

  // Enroll in course with payment
  static async enrollInCourse(
    courseId: string,
    userId: string,
    paymentIntentId?: string
  ): Promise<Enrollment> {
    const course = await githubDB.findById(collections.courses, courseId);
    if (!course) throw new Error('Course not found');

    // Check if already enrolled
    const existingEnrollment = await githubDB.findOne(collections.course_enrollments, {
      courseId,
      userId,
      status: { $in: ['active', 'pending_payment', 'pending_review'] }
    });

    if (existingEnrollment) {
      throw new Error('Already enrolled in this course');
    }

    let status: Enrollment['status'] = 'pending_payment';
    let activatedAt: string | undefined;

    // Check payment status if payment required
    if (course.price > 0 && paymentIntentId) {
      const payment = await githubDB.findById(collections.payments, paymentIntentId);
      if (payment) {
        switch (payment.status) {
          case 'completed':
            status = 'active';
            activatedAt = new Date().toISOString();
            break;
          case 'pending_review':
            status = 'pending_review';
            break;
          default:
            status = 'pending_payment';
        }
      }
    } else if (course.price === 0) {
      // Free course
      status = 'active';
      activatedAt = new Date().toISOString();
    }

    const enrollment: Enrollment = {
      id: `enroll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      courseId,
      userId,
      status,
      paymentIntentId,
      enrolledAt: new Date().toISOString(),
      activatedAt,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      progress: {
        completedLessons: [],
        completedModules: [],
        quizScores: {},
        overallProgress: 0,
        timeSpent: 0,
        lastAccessedAt: new Date().toISOString()
      }
    };

    await githubDB.create(collections.course_enrollments, enrollment);

    // Update enrollment count
    await this.updateCourseEnrollmentCount(courseId);

    return enrollment;
  }

  // Activate enrollment after payment confirmation
  static async activateEnrollment(enrollmentId: string): Promise<Enrollment> {
    const enrollment = await githubDB.findById(collections.course_enrollments, enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');

    const updatedEnrollment = {
      ...enrollment,
      status: 'active' as const,
      activatedAt: new Date().toISOString()
    };

    await githubDB.update(collections.course_enrollments, enrollmentId, updatedEnrollment);
    return updatedEnrollment;
  }

  // Mark lesson as completed
  static async markLessonCompleted(
    enrollmentId: string,
    lessonId: string,
    timeSpent: number = 0
  ): Promise<CourseProgress> {
    const enrollment = await githubDB.findById(collections.course_enrollments, enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');

    if (enrollment.status !== 'active') {
      throw new Error('Enrollment is not active');
    }

    // Add lesson to completed list if not already completed
    if (!enrollment.progress.completedLessons.includes(lessonId)) {
      enrollment.progress.completedLessons.push(lessonId);
      enrollment.progress.timeSpent += timeSpent;
      enrollment.progress.lastAccessedAt = new Date().toISOString();

      // Calculate overall progress
      const course = await githubDB.findById(collections.courses, enrollment.courseId);
      if (course) {
        const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
        enrollment.progress.overallProgress = (enrollment.progress.completedLessons.length / totalLessons) * 100;

        // Check if all lessons in modules are completed
        for (const module of course.modules) {
          const moduleCompleted = module.lessons.every(lesson => 
            enrollment.progress.completedLessons.includes(lesson.id)
          );
          
          if (moduleCompleted && !enrollment.progress.completedModules.includes(module.id)) {
            enrollment.progress.completedModules.push(module.id);
          }
        }

        // Check if course is completed
        if (enrollment.progress.overallProgress >= 100 && enrollment.status === 'active') {
          enrollment.status = 'completed';
          enrollment.completedAt = new Date().toISOString();
          
          // Generate certificate
          const certificate = await this.generateCertificate(enrollment, course);
          enrollment.certificateId = certificate.id;
        }
      }

      await githubDB.update(collections.course_enrollments, enrollmentId, enrollment);
    }

    return enrollment.progress;
  }

  // Submit quiz attempt
  static async submitQuizAttempt(
    enrollmentId: string,
    quizId: string,
    answers: Record<string, any>,
    timeSpent: number
  ): Promise<QuizAttempt> {
    const enrollment = await githubDB.findById(collections.course_enrollments, enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');

    const course = await githubDB.findById(collections.courses, enrollment.courseId);
    if (!course) throw new Error('Course not found');

    // Find the quiz
    let quiz: ModuleQuiz | undefined;
    for (const module of course.modules) {
      if (module.quiz?.id === quizId) {
        quiz = module.quiz;
        break;
      }
    }

    if (!quiz) throw new Error('Quiz not found');

    // Check attempt limit
    const existingAttempts = enrollment.progress.quizScores[quizId] || [];
    if (existingAttempts.length >= quiz.allowedAttempts) {
      throw new Error('Maximum attempts exceeded');
    }

    // Grade the quiz
    let score = 0;
    let totalPoints = 0;

    for (const question of quiz.questions) {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      
      if (this.isAnswerCorrect(question, userAnswer)) {
        score += question.points;
      }
    }

    const passed = (score / totalPoints) * 100 >= quiz.passingScore;

    const attempt: QuizAttempt = {
      attemptNumber: existingAttempts.length + 1,
      answers,
      score,
      totalPoints,
      passed,
      completedAt: new Date().toISOString(),
      timeSpent
    };

    // Update enrollment progress
    if (!enrollment.progress.quizScores[quizId]) {
      enrollment.progress.quizScores[quizId] = [];
    }
    enrollment.progress.quizScores[quizId].push(attempt);
    enrollment.progress.lastAccessedAt = new Date().toISOString();

    await githubDB.update(collections.course_enrollments, enrollmentId, enrollment);

    return attempt;
  }

  // Check if answer is correct
  private static isAnswerCorrect(question: QuizQuestion, userAnswer: any): boolean {
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        return userAnswer === question.correctAnswer;
      case 'text':
        if (Array.isArray(question.correctAnswer)) {
          return question.correctAnswer.some(correct => 
            userAnswer.toLowerCase().trim() === correct.toLowerCase().trim()
          );
        }
        return userAnswer.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim();
      case 'essay':
        // Essay questions require manual grading
        return false;
      default:
        return false;
    }
  }

  // Generate certificate
  static async generateCertificate(enrollment: Enrollment, course: Course): Promise<Certificate> {
    const user = await githubDB.findById(collections.users, enrollment.userId);
    if (!user) throw new Error('User not found');

    const certificateNumber = `CERT${Date.now().toString().slice(-8)}`;
    
    const certificate: Certificate = {
      id: `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      courseId: course.id,
      userId: enrollment.userId,
      enrollmentId: enrollment.id,
      certificateNumber,
      issuedAt: new Date().toISOString(),
      recipientName: user.full_name || user.email,
      courseTitle: course.title,
      instructorName: course.instructorName,
      completionDate: enrollment.completedAt || new Date().toISOString(),
      htmlContent: this.generateCertificateHTML(
        user.full_name || user.email,
        course.title,
        course.instructorName,
        certificateNumber,
        enrollment.completedAt || new Date().toISOString()
      ),
      metadata: {
        duration: course.duration,
        level: course.level,
        category: course.category
      }
    };

    await githubDB.create(collections.certificates, certificate);
    return certificate;
  }

  // Generate certificate HTML
  private static generateCertificateHTML(
    recipientName: string,
    courseTitle: string,
    instructorName: string,
    certificateNumber: string,
    completionDate: string
  ): string {
    const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificate of Completion</title>
    <style>
        body { font-family: 'Georgia', serif; margin: 0; padding: 40px; background: #f8f9fa; }
        .certificate { max-width: 800px; margin: 0 auto; background: white; padding: 60px; border: 10px solid #007bff; position: relative; }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 28px; font-weight: bold; color: #007bff; margin-bottom: 20px; }
        .title { font-size: 36px; color: #333; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        .subtitle { font-size: 18px; color: #666; }
        .content { text-align: center; margin: 40px 0; }
        .recipient { font-size: 32px; color: #007bff; font-weight: bold; margin: 20px 0; text-decoration: underline; }
        .course { font-size: 24px; color: #333; margin: 20px 0; font-style: italic; }
        .completion { font-size: 16px; color: #666; margin: 30px 0; }
        .footer { display: flex; justify-content: space-between; margin-top: 60px; }
        .signature { text-align: center; border-top: 2px solid #333; padding-top: 10px; min-width: 200px; }
        .cert-number { position: absolute; bottom: 20px; right: 20px; font-size: 12px; color: #999; }
        .decorative { position: absolute; opacity: 0.1; font-size: 200px; color: #007bff; }
        .decorative.top-left { top: 20px; left: 20px; }
        .decorative.bottom-right { bottom: 20px; right: 20px; }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="decorative top-left">★</div>
        <div class="decorative bottom-right">★</div>
        
        <div class="header">
            <div class="logo">CareConnect Learning</div>
            <div class="title">Certificate of Completion</div>
            <div class="subtitle">This certifies that</div>
        </div>
        
        <div class="content">
            <div class="recipient">${recipientName}</div>
            <div class="subtitle">has successfully completed the course</div>
            <div class="course">"${courseTitle}"</div>
            <div class="completion">
                on ${formattedDate}
            </div>
        </div>
        
        <div class="footer">
            <div class="signature">
                <div>${instructorName}</div>
                <div style="font-size: 14px; color: #666;">Course Instructor</div>
            </div>
            <div class="signature">
                <div>CareConnect</div>
                <div style="font-size: 14px; color: #666;">Learning Platform</div>
            </div>
        </div>
        
        <div class="cert-number">Certificate #${certificateNumber}</div>
    </div>
</body>
</html>`;
  }

  // Download certificate
  static downloadCertificate(certificate: Certificate): void {
    const blob = new Blob([certificate.htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `certificate-${certificate.certificateNumber}.html`;
    link.click();
  }

  // Get user enrollments
  static async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    return await githubDB.findMany(collections.course_enrollments, { userId });
  }

  // Get course enrollment
  static async getCourseEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
    return await githubDB.findOne(collections.course_enrollments, { courseId, userId });
  }

  // Update course enrollment count
  private static async updateCourseEnrollmentCount(courseId: string): Promise<void> {
    const enrollments = await githubDB.findMany(collections.course_enrollments, {
      courseId,
      status: { $in: ['active', 'completed'] }
    });

    await githubDB.update(collections.courses, courseId, {
      enrollmentCount: enrollments.length,
      updatedAt: new Date().toISOString()
    });
  }

  // Get popular courses
  static async getPopularCourses(limit: number = 10): Promise<Course[]> {
    const courses = await githubDB.findMany(collections.courses, { isPublished: true });
    return courses
      .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
      .slice(0, limit);
  }

  // Search courses
  static async searchCourses(query: string, filters?: {
    category?: string;
    level?: string;
    maxPrice?: number;
  }): Promise<Course[]> {
    let courses = await githubDB.findMany(collections.courses, { isPublished: true });

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      courses = courses.filter(course =>
        course.title.toLowerCase().includes(lowerQuery) ||
        course.description.toLowerCase().includes(lowerQuery) ||
        course.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        courses = courses.filter(course => course.category === filters.category);
      }
      if (filters.level) {
        courses = courses.filter(course => course.level === filters.level);
      }
      if (filters.maxPrice !== undefined) {
        courses = courses.filter(course => course.price <= filters.maxPrice!);
      }
    }

    return courses;
  }
}

export default LMSService;