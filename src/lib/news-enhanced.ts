// Enhanced Health News System with RSS/API Integration
import { githubDB, collections } from './database';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'api' | 'manual';
  category: 'general_health' | 'medical_research' | 'public_health' | 'mental_health' | 'nutrition' | 'fitness' | 'healthcare_policy';
  isActive: boolean;
  lastFetchedAt?: string;
  fetchIntervalHours: number;
  apiKey?: string;
  headers?: Record<string, string>;
  credibility: 'high' | 'medium' | 'low';
  language: string;
  region?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticle {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  imageUrl?: string;
  author?: string;
  category: string;
  tags: string[];
  publishedAt: string;
  fetchedAt: string;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  moderatedBy?: string;
  moderatedAt?: string;
  moderationNotes?: string;
  viewCount: number;
  shareCount: number;
  credibilityScore: number;
  readingTime: number; // in minutes
  language: string;
  region?: string;
  isBreaking: boolean;
  isFeatured: boolean;
  duplicateOfId?: string;
}

export interface NewsletterSubscription {
  id: string;
  userId: string;
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  categories: string[];
  isActive: boolean;
  subscribedAt: string;
  lastSentAt?: string;
  unsubscribedAt?: string;
  unsubscribeToken: string;
}

export interface NewsDigest {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  articles: string[]; // article IDs
  recipientCount: number;
  sentAt: string;
  subject: string;
  htmlContent: string;
}

export class NewsService {
  // Add news source
  static async addNewsSource(sourceData: Omit<NewsSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<NewsSource> {
    const source: NewsSource = {
      id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...sourceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.news_sources, source);
    return source;
  }

  // Fetch news from RSS feed
  static async fetchRSSNews(source: NewsSource): Promise<NewsArticle[]> {
    try {
      // Use CORS proxy for RSS feeds
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source.url)}`;
      const response = await fetch(proxyUrl);
      const rssText = await response.text();

      // Parse RSS XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rssText, 'text/xml');
      const items = xmlDoc.querySelectorAll('item');

      const articles: NewsArticle[] = [];

      items.forEach((item, index) => {
        if (index >= 20) return; // Limit to 20 articles per fetch

        const title = item.querySelector('title')?.textContent?.trim() || 'No title';
        const description = item.querySelector('description')?.textContent?.trim() || '';
        const link = item.querySelector('link')?.textContent?.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
        const author = item.querySelector('author')?.textContent?.trim() || item.querySelector('dc\\:creator')?.textContent?.trim();
        
        // Extract image from content or media elements
        let imageUrl: string | undefined;
        const mediaContent = item.querySelector('media\\:content');
        const enclosure = item.querySelector('enclosure[type^="image"]');
        
        if (mediaContent) {
          imageUrl = mediaContent.getAttribute('url') || undefined;
        } else if (enclosure) {
          imageUrl = enclosure.getAttribute('url') || undefined;
        } else {
          // Try to extract image from description HTML
          const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        // Clean description of HTML tags
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
        const readingTime = Math.max(1, Math.ceil(cleanDescription.length / 1000)); // Rough estimate

        const article: NewsArticle = {
          id: `article_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          sourceId: source.id,
          sourceName: source.name,
          title,
          content: cleanDescription,
          summary: cleanDescription.substring(0, 300) + (cleanDescription.length > 300 ? '...' : ''),
          url: link,
          imageUrl,
          author,
          category: source.category,
          tags: this.extractTags(title + ' ' + cleanDescription),
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          moderationStatus: source.credibility === 'high' ? 'approved' : 'pending',
          viewCount: 0,
          shareCount: 0,
          credibilityScore: this.calculateCredibilityScore(source.credibility, cleanDescription),
          readingTime,
          language: source.language,
          region: source.region,
          isBreaking: this.isBreakingNews(title, cleanDescription),
          isFeatured: false
        };

        articles.push(article);
      });

      return articles;
    } catch (error) {
      console.error(`Failed to fetch RSS from ${source.url}:`, error);
      return [];
    }
  }

  // Fetch news from API
  static async fetchAPINews(source: NewsSource): Promise<NewsArticle[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(source.headers || {})
      };

      if (source.apiKey) {
        headers['Authorization'] = `Bearer ${source.apiKey}`;
      }

      const response = await fetch(source.url, { headers });
      const data = await response.json();

      // This is a generic handler - would need to be customized per API
      const articles: NewsArticle[] = [];
      const items = data.articles || data.items || data.results || [];

      items.slice(0, 20).forEach((item: any, index: number) => {
        const article: NewsArticle = {
          id: `article_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          sourceId: source.id,
          sourceName: source.name,
          title: item.title || 'No title',
          content: item.content || item.description || '',
          summary: (item.description || item.content || '').substring(0, 300),
          url: item.url || item.link || '',
          imageUrl: item.urlToImage || item.image || item.thumbnail,
          author: item.author,
          category: source.category,
          tags: this.extractTags((item.title || '') + ' ' + (item.description || '')),
          publishedAt: item.publishedAt || item.pubDate || new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          moderationStatus: source.credibility === 'high' ? 'approved' : 'pending',
          viewCount: 0,
          shareCount: 0,
          credibilityScore: this.calculateCredibilityScore(source.credibility, item.content || ''),
          readingTime: Math.max(1, Math.ceil((item.content || '').length / 1000)),
          language: source.language,
          region: source.region,
          isBreaking: this.isBreakingNews(item.title || '', item.description || ''),
          isFeatured: false
        };

        articles.push(article);
      });

      return articles;
    } catch (error) {
      console.error(`Failed to fetch API from ${source.url}:`, error);
      return [];
    }
  }

  // Extract relevant tags from content
  private static extractTags(text: string): string[] {
    const healthKeywords = [
      'covid', 'vaccine', 'diabetes', 'cancer', 'heart', 'mental health', 'nutrition',
      'fitness', 'research', 'study', 'treatment', 'medication', 'hospital', 'doctor',
      'patient', 'disease', 'symptoms', 'diagnosis', 'therapy', 'prevention', 'wellness'
    ];

    const lowerText = text.toLowerCase();
    return healthKeywords.filter(keyword => lowerText.includes(keyword));
  }

  // Calculate credibility score
  private static calculateCredibilityScore(sourceCredibility: string, content: string): number {
    let baseScore = sourceCredibility === 'high' ? 90 : sourceCredibility === 'medium' ? 70 : 50;
    
    // Adjust based on content quality indicators
    if (content.length > 500) baseScore += 5;
    if (content.includes('study') || content.includes('research')) baseScore += 5;
    if (content.includes('doctor') || content.includes('medical')) baseScore += 3;
    
    return Math.min(100, baseScore);
  }

  // Check if news is breaking
  private static isBreakingNews(title: string, content: string): boolean {
    const breakingKeywords = ['breaking', 'urgent', 'alert', 'emergency', 'outbreak', 'crisis'];
    const text = (title + ' ' + content).toLowerCase();
    return breakingKeywords.some(keyword => text.includes(keyword));
  }

  // Fetch all news from active sources
  static async fetchAllNews(): Promise<void> {
    const sources = await githubDB.findMany(collections.news_sources, { isActive: true });
    
    for (const source of sources) {
      try {
        let articles: NewsArticle[] = [];
        
        if (source.type === 'rss') {
          articles = await this.fetchRSSNews(source);
        } else if (source.type === 'api') {
          articles = await this.fetchAPINews(source);
        }

        // Check for duplicates and save new articles
        for (const article of articles) {
          const existing = await githubDB.findOne(collections.news_articles, {
            url: article.url,
            title: article.title
          });

          if (!existing) {
            await githubDB.create(collections.news_articles, article);
          }
        }

        // Update source last fetched time
        await githubDB.update(collections.news_sources, source.id, {
          lastFetchedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Error fetching from source ${source.name}:`, error);
      }
    }
  }

  // Subscribe to newsletter
  static async subscribeToNewsletter(
    userId: string,
    email: string,
    frequency: NewsletterSubscription['frequency'],
    categories: string[]
  ): Promise<NewsletterSubscription> {
    // Check if already subscribed
    const existing = await githubDB.findOne(collections.newsletter_subscriptions, { email });
    if (existing && existing.isActive) {
      throw new Error('Already subscribed to newsletter');
    }

    const subscription: NewsletterSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      email,
      frequency,
      categories,
      isActive: true,
      subscribedAt: new Date().toISOString(),
      unsubscribeToken: Math.random().toString(36).substr(2, 20)
    };

    if (existing) {
      // Reactivate existing subscription
      await githubDB.update(collections.newsletter_subscriptions, existing.id, {
        ...subscription,
        id: existing.id
      });
      return { ...subscription, id: existing.id };
    } else {
      await githubDB.create(collections.newsletter_subscriptions, subscription);
      return subscription;
    }
  }

  // Unsubscribe from newsletter
  static async unsubscribeFromNewsletter(token: string): Promise<void> {
    const subscription = await githubDB.findOne(collections.newsletter_subscriptions, {
      unsubscribeToken: token,
      isActive: true
    });

    if (!subscription) {
      throw new Error('Invalid unsubscribe token');
    }

    await githubDB.update(collections.newsletter_subscriptions, subscription.id, {
      isActive: false,
      unsubscribedAt: new Date().toISOString()
    });

    // Add to unsubscribe records
    await githubDB.create(collections.unsubscribe_records, {
      id: `unsub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: subscription.email,
      type: 'newsletter',
      unsubscribedAt: new Date().toISOString(),
      token
    });
  }

  // Generate newsletter digest
  static async generateNewsletterDigest(
    type: NewsDigest['type'],
    categories?: string[]
  ): Promise<NewsDigest> {
    const now = new Date();
    let startDate: Date;

    switch (type) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get approved articles from the time period
    let articles = await githubDB.findMany(collections.news_articles, {
      moderationStatus: 'approved',
      publishedAt: { $gte: startDate.toISOString() }
    });

    // Filter by categories if specified
    if (categories && categories.length > 0) {
      articles = articles.filter(article => categories.includes(article.category));
    }

    // Sort by credibility score and recency
    articles.sort((a, b) => {
      const scoreA = a.credibilityScore + (a.isBreaking ? 20 : 0) + (a.isFeatured ? 10 : 0);
      const scoreB = b.credibilityScore + (b.isBreaking ? 20 : 0) + (b.isFeatured ? 10 : 0);
      return scoreB - scoreA;
    });

    // Take top articles (limit based on digest type)
    const limit = type === 'daily' ? 10 : type === 'weekly' ? 20 : 30;
    const topArticles = articles.slice(0, limit);

    const digest: NewsDigest = {
      id: `digest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      date: now.toISOString().split('T')[0],
      articles: topArticles.map(a => a.id),
      recipientCount: 0,
      sentAt: new Date().toISOString(),
      subject: this.generateDigestSubject(type, topArticles),
      htmlContent: this.generateDigestHTML(type, topArticles)
    };

    await githubDB.create(collections.analytics_events, {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'newsletter_digest_generated',
      entityType: 'digest',
      entityId: digest.id,
      data: { type, articlesCount: topArticles.length },
      timestamp: new Date().toISOString()
    });

    return digest;
  }

  // Generate digest subject line
  private static generateDigestSubject(type: string, articles: NewsArticle[]): string {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    const date = new Date().toLocaleDateString();
    
    if (articles.some(a => a.isBreaking)) {
      return `${typeCapitalized} Health Digest - Breaking News - ${date}`;
    }
    
    return `${typeCapitalized} Health Digest - ${date}`;
  }

  // Generate digest HTML content
  private static generateDigestHTML(type: string, articles: NewsArticle[]): string {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    const date = new Date().toLocaleDateString();

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${typeCapitalized} Health Digest</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #007bff; }
        .article { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .article:last-child { border-bottom: none; }
        .article-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .article-title a { color: #333; text-decoration: none; }
        .article-title a:hover { color: #007bff; }
        .article-meta { font-size: 12px; color: #666; margin-bottom: 10px; }
        .article-summary { line-height: 1.6; color: #555; }
        .breaking { background: #ff4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 10px; }
        .featured { background: #ffa500; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 10px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
        .unsubscribe { margin-top: 20px; text-align: center; }
        .unsubscribe a { color: #666; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">CareConnect Health News</div>
            <h2>${typeCapitalized} Digest - ${date}</h2>
        </div>
        
        <div class="articles">`;

    articles.forEach(article => {
      const badges = [];
      if (article.isBreaking) badges.push('<span class="breaking">BREAKING</span>');
      if (article.isFeatured) badges.push('<span class="featured">FEATURED</span>');

      html += `
            <div class="article">
                <div class="article-title">
                    <a href="${article.url}" target="_blank">${article.title}</a>
                    ${badges.join('')}
                </div>
                <div class="article-meta">
                    ${article.sourceName} • ${new Date(article.publishedAt).toLocaleDateString()} • ${article.readingTime} min read
                </div>
                <div class="article-summary">${article.summary}</div>
            </div>`;
    });

    html += `
        </div>
        
        <div class="footer">
            <p>You're receiving this digest because you subscribed to CareConnect Health News.</p>
            <div class="unsubscribe">
                <a href="{{unsubscribe_url}}">Unsubscribe</a> | 
                <a href="https://careconnect.com/news">View Online</a>
            </div>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  // Send newsletter digest
  static async sendNewsletterDigest(digest: NewsDigest, frequency: string): Promise<void> {
    const subscriptions = await githubDB.findMany(collections.newsletter_subscriptions, {
      frequency,
      isActive: true
    });

    for (const subscription of subscriptions) {
      // Create in-app notification
      await githubDB.create(collections.notifications, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: subscription.userId,
        type: 'newsletter_digest',
        title: digest.subject,
        message: `Your ${frequency} health news digest is ready`,
        data: { digestId: digest.id, unsubscribeToken: subscription.unsubscribeToken },
        createdAt: new Date().toISOString(),
        read: false,
        priority: 'low'
      });

      // Update last sent time
      await githubDB.update(collections.newsletter_subscriptions, subscription.id, {
        lastSentAt: new Date().toISOString()
      });
    }

    // Update digest recipient count
    await githubDB.update(collections.analytics_events, digest.id, {
      recipientCount: subscriptions.length
    });
  }

  // Get articles with pagination and filters
  static async getArticles(
    page: number = 1,
    limit: number = 20,
    filters?: {
      category?: string;
      moderationStatus?: string;
      isBreaking?: boolean;
      isFeatured?: boolean;
    },
    sortBy: 'newest' | 'oldest' | 'mostViewed' | 'credibility' = 'newest'
  ): Promise<{ articles: NewsArticle[]; total: number; hasMore: boolean }> {
    let articles = await githubDB.findMany(collections.news_articles, {
      moderationStatus: filters?.moderationStatus || 'approved'
    });

    // Apply filters
    if (filters) {
      if (filters.category) {
        articles = articles.filter(a => a.category === filters.category);
      }
      if (filters.isBreaking !== undefined) {
        articles = articles.filter(a => a.isBreaking === filters.isBreaking);
      }
      if (filters.isFeatured !== undefined) {
        articles = articles.filter(a => a.isFeatured === filters.isFeatured);
      }
    }

    // Sort articles
    switch (sortBy) {
      case 'newest':
        articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case 'oldest':
        articles.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
        break;
      case 'mostViewed':
        articles.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case 'credibility':
        articles.sort((a, b) => b.credibilityScore - a.credibilityScore);
        break;
    }

    const total = articles.length;
    const start = (page - 1) * limit;
    const paginatedArticles = articles.slice(start, start + limit);

    return {
      articles: paginatedArticles,
      total,
      hasMore: start + limit < total
    };
  }

  // Record article view
  static async recordArticleView(articleId: string): Promise<void> {
    const article = await githubDB.findById(collections.news_articles, articleId);
    if (article) {
      await githubDB.update(collections.news_articles, articleId, {
        viewCount: article.viewCount + 1
      });
    }
  }

  // Search articles
  static async searchArticles(query: string, category?: string): Promise<NewsArticle[]> {
    let articles = await githubDB.findMany(collections.news_articles, {
      moderationStatus: 'approved'
    });

    // Text search
    const lowerQuery = query.toLowerCase();
    articles = articles.filter(article =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.content.toLowerCase().includes(lowerQuery) ||
      article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    // Category filter
    if (category) {
      articles = articles.filter(a => a.category === category);
    }

    return articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
}

export default NewsService;