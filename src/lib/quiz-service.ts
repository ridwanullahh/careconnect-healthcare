import { githubDB as db, collections } from './database';

export interface Quiz {
  id?: string;
  uid?: string;
  lesson_id: string;
  course_id: string;
  title: string;
  questions: QuizQuestion[];
  passing_score: number;
  time_limit_minutes?: number;
  max_attempts: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer: string;
  points: number;
  explanation?: string;
}

export interface QuizAttempt {
  id?: string;
  uid?: string;
  quiz_id: string;
  user_id: string;
  course_id: string;
  answers: Record<string, string>;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
}

export interface Certificate {
  id?: string;
  uid?: string;
  user_id: string;
  course_id: string;
  course_title: string;
  user_name: string;
  score: number;
  issued_at: string;
  certificate_number: string;
  verification_url: string;
}

export class QuizService {
  static async createQuiz(quiz: Omit<Quiz, 'id' | 'uid' | 'created_at'>): Promise<Quiz> {
    return db.insert(collections.course_lessons, {
      ...quiz,
      type: 'quiz',
      created_at: new Date().toISOString(),
    }) as Promise<Quiz>;
  }

  static async getQuiz(lessonId: string): Promise<Quiz | null> {
    const lesson = await db.findById(collections.course_lessons, lessonId) as any;
    if (!lesson || lesson.type !== 'quiz') return null;
    return lesson as Quiz;
  }

  static async submitAttempt(
    quizId: string,
    userId: string,
    courseId: string,
    answers: Record<string, string>
  ): Promise<QuizAttempt> {
    const quiz = await db.findById(collections.course_lessons, quizId) as any;
    if (!quiz || !quiz.questions) throw new Error('Quiz not found');

    const questions = quiz.questions as QuizQuestion[];
    let score = 0;
    const totalPoints = questions.reduce((sum: number, q: QuizQuestion) => sum + q.points, 0);

    for (const q of questions) {
      const answer = answers[q.id];
      if (!answer) continue;
      if (q.type === 'short_answer') {
        if (answer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
          score += q.points;
        }
      } else {
        if (answer === q.correct_answer) score += q.points;
      }
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= (quiz.passing_score || 70);

    const attempt = await db.insert(collections.course_progress, {
      quiz_id: quizId,
      user_id: userId,
      course_id: courseId,
      type: 'quiz_attempt',
      answers,
      score,
      total_points: totalPoints,
      percentage,
      passed,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }) as unknown as QuizAttempt;

    if (passed) {
      await this.checkAndIssueCertificate(userId, courseId);
    }

    return attempt;
  }

  static async getAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    return db.find(collections.course_progress, (a: any) =>
      a.user_id === userId && a.quiz_id === quizId && a.type === 'quiz_attempt'
    ) as Promise<QuizAttempt[]>;
  }

  static async getBestAttempt(userId: string, quizId: string): Promise<QuizAttempt | null> {
    const attempts = await this.getAttempts(userId, quizId);
    if (attempts.length === 0) return null;
    return attempts.reduce((best, curr) =>
      (curr as any).percentage > (best as any).percentage ? curr : best
    );
  }

  static async checkAndIssueCertificate(userId: string, courseId: string): Promise<Certificate | null> {
    const existing = await db.find(collections.certificates, (c: any) =>
      c.user_id === userId && c.course_id === courseId
    );
    if (existing.length > 0) return existing[0] as Certificate;

    const course = await db.findById(collections.courses, courseId) as any;
    if (!course) return null;

    const lessons = await db.find(collections.course_lessons, (l: any) =>
      l.course_id === courseId && l.type === 'quiz'
    ) as any[];

    let allPassed = true;
    for (const lesson of lessons) {
      const bestAttempt = await this.getBestAttempt(userId, lesson.id);
      if (!bestAttempt || !(bestAttempt as any).passed) {
        allPassed = false;
        break;
      }
    }

    if (!allPassed || lessons.length === 0) return null;

    const profiles = await db.find(collections.profiles, { user_id: userId });
    const profile = profiles[0] as any;
    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Student';

    const certNumber = `CC-${courseId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    return db.insert(collections.certificates, {
      user_id: userId,
      course_id: courseId,
      course_title: course.title,
      user_name: userName,
      score: 100,
      issued_at: new Date().toISOString(),
      certificate_number: certNumber,
      verification_url: `/certificates/${certNumber}`,
    }) as Promise<Certificate>;
  }

  static generateCertificateHTML(cert: Certificate): string {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Certificate - ${cert.course_title}</title>
<style>
  body { font-family: Georgia, serif; text-align: center; padding: 60px; background: #fff; }
  .cert { border: 3px double #0d9488; padding: 60px; max-width: 800px; margin: 0 auto; }
  h1 { color: #0d9488; font-size: 36px; margin-bottom: 10px; }
  h2 { color: #333; font-size: 24px; font-weight: normal; }
  .name { font-size: 32px; color: #111; margin: 20px 0; border-bottom: 2px solid #0d9488; display: inline-block; padding-bottom: 5px; }
  .course { font-size: 20px; color: #444; margin: 15px 0; }
  .details { font-size: 14px; color: #666; margin-top: 30px; }
  .number { font-size: 12px; color: #999; margin-top: 10px; }
</style></head><body>
<div class="cert">
  <h1>CareConnect Healthcare</h1>
  <h2>Certificate of Completion</h2>
  <p>This is to certify that</p>
  <div class="name">${cert.user_name}</div>
  <p>has successfully completed the course</p>
  <div class="course">${cert.course_title}</div>
  <div class="details">
    <p>Issued on ${new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p>Score: ${cert.score}%</p>
  </div>
  <div class="number">Certificate No: ${cert.certificate_number}</div>
</div>
</body></html>`;
  }

  static downloadCertificate(cert: Certificate): void {
    const html = this.generateCertificateHTML(cert);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${cert.certificate_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default QuizService;
