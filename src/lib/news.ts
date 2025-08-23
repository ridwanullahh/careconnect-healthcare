// Enhanced News and Content Management System
import { githubDB, collections } from './database';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  rss_url?: string;
  api_endpoint?: string;
  category: string;
  language: string;
  is_active: boolean;
  last_fetched?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  source: string;
  source_url: string;
  image_url?: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  category: string;
  tags: string[];
  ai_summary?: string;
  status: 'draft' | 'published' | 'archived' | 'pending_approval';
  featured: boolean;
  views: number;
  likes: number;
  is_ai_generated: boolean;
  admin_approved: boolean;
  admin_notes?: string;
  author_id?: string;
  author_name?: string;
}

export interface WeeklyTip {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  image_url?: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  week_number: number;
  year: number;
  created_at: string;
  updated_at: string;
  author_id: string;
  views: number;
  likes: number;
}

export interface TimelessFact {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  image_url?: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
  views: number;
  likes: number;
  fact_type: 'medical' | 'nutrition' | 'wellness' | 'prevention' | 'general';
}

export class NewsService {
  // Public news feed (only approved articles)
  static async getNewsFeed(filters: {
    category?: string;
    query?: string;
    limit?: number;
  }): Promise<NewsArticle[]> {
    let articles = await githubDB.find(collections.news_articles, {
      status: 'published',
      admin_approved: true
    });

    if (filters.category) {
      articles = articles.filter(article => article.category === filters.category);
    }

    if (filters.query) {
      const query = filters.query.toLowerCase();
      articles = articles.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.ai_summary?.toLowerCase().includes(query) ||
        article.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    articles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    if (filters.limit) {
      articles = articles.slice(0, filters.limit);
    }

    return articles;
  }

  // Admin: Get all articles including pending
  static async getAllArticles(filters: {
    status?: string;
    is_ai_generated?: boolean;
    admin_approved?: boolean;
  } = {}): Promise<NewsArticle[]> {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.is_ai_generated !== undefined) query.is_ai_generated = filters.is_ai_generated;
    if (filters.admin_approved !== undefined) query.admin_approved = filters.admin_approved;

    const articles = await githubDB.find(collections.news_articles, query);
    return articles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getArticle(articleId: string): Promise<NewsArticle | null> {
    const article = await githubDB.findById(collections.news_articles, articleId);
    
    // Increment view count
    if (article) {
      await githubDB.update(collections.news_articles, articleId, {
        views: (article.views || 0) + 1
      });
    }
    
    return article;
  }

  // Admin: Create news article
  static async createArticle(articleData: Partial<NewsArticle>, authorId: string): Promise<NewsArticle> {
    const article: NewsArticle = {
      id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: articleData.title || '',
      excerpt: articleData.excerpt || '',
      content: articleData.content || '',
      source: articleData.source || 'CareConnect',
      source_url: articleData.source_url || '',
      image_url: articleData.image_url,
      published_at: articleData.published_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: articleData.category || 'general',
      tags: articleData.tags || [],
      ai_summary: articleData.ai_summary,
      status: articleData.status || 'draft',
      featured: articleData.featured || false,
      views: 0,
      likes: 0,
      is_ai_generated: articleData.is_ai_generated || false,
      admin_approved: articleData.admin_approved || false,
      admin_notes: articleData.admin_notes,
      author_id: authorId,
      author_name: articleData.author_name
    };

    await githubDB.insert(collections.news_articles, article);
    return article;
  }

  // Admin: Update article
  static async updateArticle(articleId: string, updates: Partial<NewsArticle>): Promise<NewsArticle | null> {
    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    await githubDB.update(collections.news_articles, articleId, updatedData);
    return await this.getArticle(articleId);
  }

  // Admin: Approve article
  static async approveArticle(articleId: string, adminNotes?: string): Promise<void> {
    await githubDB.update(collections.news_articles, articleId, {
      admin_approved: true,
      status: 'published',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  // Admin: Reject article
  static async rejectArticle(articleId: string, adminNotes: string): Promise<void> {
    await githubDB.update(collections.news_articles, articleId, {
      admin_approved: false,
      status: 'draft',
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    });
  }

  static async deleteArticle(articleId: string): Promise<void> {
    await githubDB.delete(collections.news_articles, articleId);
  }

  // AI News Aggregation (Admin only)
  static async aggregateNewsFromSources(): Promise<void> {
    const sources = await githubDB.find(collections.news_sources, { is_active: true });
    
    for (const source of sources) {
      try {
        await this.fetchFromSource(source);
      } catch (error) {
        console.error(`Failed to fetch from source ${source.name}:`, error);
      }
    }
  }

  private static async fetchFromSource(source: NewsSource): Promise<void> {
    // This would integrate with RSS feeds or news APIs
    // For now, we'll create a placeholder implementation
    console.log(`Fetching from ${source.name}...`);
    
    // Update last fetched timestamp
    await githubDB.update(collections.news_sources, source.id, {
      last_fetched: new Date().toISOString()
    });
  }

  // News Sources Management
  static async createNewsSource(sourceData: Partial<NewsSource>): Promise<NewsSource> {
    const source: NewsSource = {
      id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: sourceData.name || '',
      url: sourceData.url || '',
      rss_url: sourceData.rss_url,
      api_endpoint: sourceData.api_endpoint,
      category: sourceData.category || 'general',
      language: sourceData.language || 'en',
      is_active: sourceData.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await githubDB.insert(collections.news_sources, source);
    return source;
  }

  static async getNewsSources(): Promise<NewsSource[]> {
    return await githubDB.find(collections.news_sources, {});
  }

  static async updateNewsSource(sourceId: string, updates: Partial<NewsSource>): Promise<void> {
    await githubDB.update(collections.news_sources, sourceId, {
      ...updates,
      updated_at: new Date().toISOString()
    });
  }

  static async deleteNewsSource(sourceId: string): Promise<void> {
    await githubDB.delete(collections.news_sources, sourceId);
  }

  static async subscribeToNewsletter(email: string): Promise<boolean> {
    try {
      await githubDB.insert(collections.newsletter_subscriptions, {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        subscribed_at: new Date().toISOString(),
        is_active: true
      });
      return true;
    } catch (error) {
      console.error('Newsletter subscription failed:', error);
      return false;
    }
  }
}

// Weekly Tips Service
export class WeeklyTipsService {
  static async getPublishedTips(limit?: number): Promise<WeeklyTip[]> {
    let tips = await githubDB.find(collections.weekly_tips, { status: 'published' });
    tips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (limit) {
      tips = tips.slice(0, limit);
    }
    
    return tips;
  }

  static async getAllTips(): Promise<WeeklyTip[]> {
    const tips = await githubDB.find(collections.weekly_tips, {});
    return tips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getTip(tipId: string): Promise<WeeklyTip | null> {
    const tip = await githubDB.findById(collections.weekly_tips, tipId);
    
    if (tip) {
      await githubDB.update(collections.weekly_tips, tipId, {
        views: (tip.views || 0) + 1
      });
    }
    
    return tip;
  }

  static async createTip(tipData: Partial<WeeklyTip>, authorId: string): Promise<WeeklyTip> {
    const currentDate = new Date();
    const tip: WeeklyTip = {
      id: `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: tipData.title || '',
      content: tipData.content || '',
      category: tipData.category || 'general',
      tags: tipData.tags || [],
      image_url: tipData.image_url,
      status: tipData.status || 'draft',
      featured: tipData.featured || false,
      week_number: tipData.week_number || this.getWeekNumber(currentDate),
      year: tipData.year || currentDate.getFullYear(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_id: authorId,
      views: 0,
      likes: 0
    };

    await githubDB.insert(collections.weekly_tips, tip);
    return tip;
  }

  static async updateTip(tipId: string, updates: Partial<WeeklyTip>): Promise<WeeklyTip | null> {
    await githubDB.update(collections.weekly_tips, tipId, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    return await this.getTip(tipId);
  }

  static async deleteTip(tipId: string): Promise<void> {
    await githubDB.delete(collections.weekly_tips, tipId);
  }

  private static getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

// Timeless Facts Service
export class TimelessFactsService {
  static async getPublishedFacts(limit?: number): Promise<TimelessFact[]> {
    let facts = await githubDB.find(collections.timeless_facts, { status: 'published' });
    facts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (limit) {
      facts = facts.slice(0, limit);
    }
    
    return facts;
  }

  static async getAllFacts(): Promise<TimelessFact[]> {
    const facts = await githubDB.find(collections.timeless_facts, {});
    return facts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getFact(factId: string): Promise<TimelessFact | null> {
    const fact = await githubDB.findById(collections.timeless_facts, factId);
    
    if (fact) {
      await githubDB.update(collections.timeless_facts, factId, {
        views: (fact.views || 0) + 1
      });
    }
    
    return fact;
  }

  static async createFact(factData: Partial<TimelessFact>, authorId: string): Promise<TimelessFact> {
    const fact: TimelessFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: factData.title || '',
      content: factData.content || '',
      category: factData.category || 'general',
      tags: factData.tags || [],
      image_url: factData.image_url,
      status: factData.status || 'draft',
      featured: factData.featured || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_id: authorId,
      views: 0,
      likes: 0,
      fact_type: factData.fact_type || 'general'
    };

    await githubDB.insert(collections.timeless_facts, fact);
    return fact;
  }

  static async updateFact(factId: string, updates: Partial<TimelessFact>): Promise<TimelessFact | null> {
    await githubDB.update(collections.timeless_facts, factId, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    return await this.getFact(factId);
  }

  static async deleteFact(factId: string): Promise<void> {
    await githubDB.delete(collections.timeless_facts, factId);
  }
}