// Enhanced Q&A Forum System
import { githubDB, collections } from './database';

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface ForumQuestion {
  id: string;
  title: string;
  content: string;
  category_id: string;
  category_name: string;
  tags: string[];
  author_id?: string; // Optional for anonymous questions
  author_name?: string;
  author_type?: 'public_user' | 'health_center' | 'practitioner' | 'pharmacy' | 'anonymous';
  is_anonymous: boolean;
  status: 'pending_approval' | 'approved' | 'rejected' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  views: number;
  likes: number;
  answer_count: number;
  has_accepted_answer: boolean;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  featured: boolean;
  image_urls?: string[];
}

export interface ForumAnswer {
  id: string;
  question_id: string;
  content: string;
  author_id: string;
  author_name: string;
  author_type: 'health_center' | 'practitioner' | 'super_admin';
  author_credentials?: string;
  author_specialties?: string[];
  status: 'pending_approval' | 'approved' | 'rejected';
  is_accepted: boolean;
  likes: number;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  references?: string[];
  image_urls?: string[];
}

export interface ForumComment {
  id: string;
  parent_type: 'question' | 'answer';
  parent_id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export class ForumService {
  // Public: Get approved questions
  static async getQuestions(filters: {
    category_id?: string;
    tags?: string[];
    search?: string;
    status?: string;
    limit?: number;
    featured?: boolean;
  } = {}): Promise<ForumQuestion[]> {
    const query: any = { status: 'approved' };
    
    if (filters.category_id) query.category_id = filters.category_id;
    if (filters.featured !== undefined) query.featured = filters.featured;

    let questions = await githubDB.find(collections.forum_questions, query);

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      questions = questions.filter(q => 
        filters.tags!.some(tag => q.tags.includes(tag))
      );
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      questions = questions.filter(q =>
        q.title.toLowerCase().includes(searchTerm) ||
        q.content.toLowerCase().includes(searchTerm) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Sort by priority and creation date
    questions.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (filters.limit) {
      questions = questions.slice(0, filters.limit);
    }

    return questions;
  }

  // Admin: Get all questions including pending
  static async getAllQuestions(filters: {
    status?: string;
    category_id?: string;
  } = {}): Promise<ForumQuestion[]> {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.category_id) query.category_id = filters.category_id;

    const questions = await githubDB.find(collections.forum_questions, query);
    return questions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getQuestion(questionId: string): Promise<ForumQuestion | null> {
    const question = await githubDB.findById(collections.forum_questions, questionId);
    
    // Increment view count
    if (question && question.status === 'approved') {
      await githubDB.update(collections.forum_questions, questionId, {
        views: (question.views || 0) + 1
      });
    }
    
    return question;
  }

  // Create question (subject to admin approval)
  static async createQuestion(questionData: {
    title: string;
    content: string;
    category_id: string;
    tags: string[];
    author_id?: string;
    author_name?: string;
    author_type?: string;
    is_anonymous: boolean;
    priority?: string;
    image_urls?: string[];
  }): Promise<ForumQuestion> {
    const category = await githubDB.findById(collections.forum_categories, questionData.category_id);
    
    const question: ForumQuestion = {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: questionData.title,
      content: questionData.content,
      category_id: questionData.category_id,
      category_name: category?.name || 'General',
      tags: questionData.tags,
      author_id: questionData.is_anonymous ? undefined : questionData.author_id,
      author_name: questionData.is_anonymous ? 'Anonymous' : questionData.author_name,
      author_type: questionData.is_anonymous ? 'anonymous' : (questionData.author_type as any),
      is_anonymous: questionData.is_anonymous,
      status: 'pending_approval',
      priority: (questionData.priority as any) || 'medium',
      views: 0,
      likes: 0,
      answer_count: 0,
      has_accepted_answer: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      featured: false,
      image_urls: questionData.image_urls
    };

    await githubDB.insert(collections.forum_questions, question);
    return question;
  }

  // Admin: Approve question
  static async approveQuestion(questionId: string, adminNotes?: string): Promise<void> {
    await githubDB.update(collections.forum_questions, questionId, {
      status: 'approved',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  // Admin: Reject question
  static async rejectQuestion(questionId: string, adminNotes: string): Promise<void> {
    await githubDB.update(collections.forum_questions, questionId, {
      status: 'rejected',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  // Get answers for a question
  static async getAnswers(questionId: string): Promise<ForumAnswer[]> {
    const answers = await githubDB.find(collections.forum_answers, {
      question_id: questionId,
      status: 'approved'
    });

    // Sort by accepted answer first, then by likes and date
    return answers.sort((a, b) => {
      if (a.is_accepted && !b.is_accepted) return -1;
      if (!a.is_accepted && b.is_accepted) return 1;
      
      if (a.likes !== b.likes) {
        return b.likes - a.likes;
      }
      
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  // Admin: Get all answers including pending
  static async getAllAnswers(filters: {
    status?: string;
    question_id?: string;
  } = {}): Promise<ForumAnswer[]> {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.question_id) query.question_id = filters.question_id;

    const answers = await githubDB.find(collections.forum_answers, query);
    return answers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Create answer (only doctors, health centers, and admins)
  static async createAnswer(answerData: {
    question_id: string;
    content: string;
    author_id: string;
    author_name: string;
    author_type: 'health_center' | 'practitioner' | 'super_admin';
    author_credentials?: string;
    author_specialties?: string[];
    references?: string[];
    image_urls?: string[];
  }): Promise<ForumAnswer> {
    const answer: ForumAnswer = {
      id: `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question_id: answerData.question_id,
      content: answerData.content,
      author_id: answerData.author_id,
      author_name: answerData.author_name,
      author_type: answerData.author_type,
      author_credentials: answerData.author_credentials,
      author_specialties: answerData.author_specialties,
      status: answerData.author_type === 'super_admin' ? 'approved' : 'pending_approval',
      is_accepted: false,
      likes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      references: answerData.references,
      image_urls: answerData.image_urls
    };

    await githubDB.insert(collections.forum_answers, answer);

    // Update question answer count
    const question = await this.getQuestion(answerData.question_id);
    if (question) {
      await githubDB.update(collections.forum_questions, answerData.question_id, {
        answer_count: (question.answer_count || 0) + 1,
        updated_at: new Date().toISOString()
      });
    }

    return answer;
  }

  // Admin: Approve answer
  static async approveAnswer(answerId: string, adminNotes?: string): Promise<void> {
    await githubDB.update(collections.forum_answers, answerId, {
      status: 'approved',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  // Admin: Reject answer
  static async rejectAnswer(answerId: string, adminNotes: string): Promise<void> {
    await githubDB.update(collections.forum_answers, answerId, {
      status: 'rejected',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  // Accept answer (by question author or admin)
  static async acceptAnswer(answerId: string, questionId: string): Promise<void> {
    // First, unaccept any previously accepted answers
    const existingAnswers = await githubDB.find(collections.forum_answers, {
      question_id: questionId,
      is_accepted: true
    });

    for (const answer of existingAnswers) {
      await githubDB.update(collections.forum_answers, answer.id, {
        is_accepted: false,
        updated_at: new Date().toISOString()
      });
    }

    // Accept the new answer
    await githubDB.update(collections.forum_answers, answerId, {
      is_accepted: true,
      updated_at: new Date().toISOString()
    });

    // Update question status
    await githubDB.update(collections.forum_questions, questionId, {
      has_accepted_answer: true,
      updated_at: new Date().toISOString()
    });
  }

  // Like/Unlike question or answer
  static async toggleLike(itemType: 'question' | 'answer', itemId: string, userId: string): Promise<number> {
    const collection = itemType === 'question' ? collections.forum_questions : collections.forum_answers;
    const item = await githubDB.findById(collection, itemId);
    
    if (!item) return 0;

    // For simplicity, we'll just increment/decrement likes
    // In a real app, you'd track individual user likes
    const newLikes = Math.max(0, (item.likes || 0) + 1);
    
    await githubDB.update(collection, itemId, {
      likes: newLikes,
      updated_at: new Date().toISOString()
    });

    return newLikes;
  }

  // Categories Management
  static async getCategories(): Promise<ForumCategory[]> {
    const categories = await githubDB.find(collections.forum_categories, { is_active: true });
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  }

  static async createCategory(categoryData: Partial<ForumCategory>): Promise<ForumCategory> {
    const category: ForumCategory = {
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: categoryData.name || '',
      description: categoryData.description || '',
      icon: categoryData.icon || 'HelpCircle',
      color: categoryData.color || '#3B82F6',
      is_active: categoryData.is_active !== false,
      question_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await githubDB.insert(collections.forum_categories, category);
    return category;
  }

  static async updateCategory(categoryId: string, updates: Partial<ForumCategory>): Promise<void> {
    await githubDB.update(collections.forum_categories, categoryId, {
      ...updates,
      updated_at: new Date().toISOString()
    });
  }

  static async deleteCategory(categoryId: string): Promise<void> {
    await githubDB.update(collections.forum_categories, categoryId, {
      is_active: false,
      updated_at: new Date().toISOString()
    });
  }

  // Initialize default categories
  static async initializeDefaultCategories(): Promise<void> {
    const existingCategories = await this.getCategories();
    if (existingCategories.length > 0) return;

    const defaultCategories = [
      {
        name: 'General Health',
        description: 'General health questions and concerns',
        icon: 'Heart',
        color: '#EF4444'
      },
      {
        name: 'Mental Health',
        description: 'Mental health and wellness questions',
        icon: 'Brain',
        color: '#8B5CF6'
      },
      {
        name: 'Nutrition',
        description: 'Diet, nutrition, and healthy eating',
        icon: 'Apple',
        color: '#10B981'
      },
      {
        name: 'Exercise & Fitness',
        description: 'Physical activity and fitness questions',
        icon: 'Dumbbell',
        color: '#F59E0B'
      },
      {
        name: 'Medications',
        description: 'Questions about medications and treatments',
        icon: 'Pill',
        color: '#3B82F6'
      },
      {
        name: 'Chronic Conditions',
        description: 'Managing chronic health conditions',
        icon: 'Activity',
        color: '#DC2626'
      },
      {
        name: 'Preventive Care',
        description: 'Prevention and early detection',
        icon: 'Shield',
        color: '#059669'
      }
    ];

    for (const categoryData of defaultCategories) {
      await this.createCategory(categoryData);
    }
  }

  // Search functionality
  static async searchQuestions(query: string, filters: {
    category_id?: string;
    tags?: string[];
  } = {}): Promise<ForumQuestion[]> {
    return await this.getQuestions({
      ...filters,
      search: query,
      limit: 50
    });
  }

  // Get trending questions (most viewed/liked recently)
  static async getTrendingQuestions(limit: number = 10): Promise<ForumQuestion[]> {
    const questions = await this.getQuestions({ limit: 100 });
    
    // Simple trending algorithm based on views and likes in recent time
    return questions
      .sort((a, b) => {
        const aScore = (a.views || 0) + (a.likes || 0) * 2;
        const bScore = (b.views || 0) + (b.likes || 0) * 2;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  // Get unanswered questions
  static async getUnansweredQuestions(limit: number = 20): Promise<ForumQuestion[]> {
    return await this.getQuestions({
      limit: 100
    }).then(questions => 
      questions
        .filter(q => q.answer_count === 0)
        .slice(0, limit)
    );
  }
}