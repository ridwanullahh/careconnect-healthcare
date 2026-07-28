// Production News Aggregator with AI Summarization
import { githubDB, collections } from './database';
import { KeyManagementService, KeyType } from './key-management';
import { logger } from './observability';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  rss_url?: string;
  api_endpoint?: string;
  api_key_required: boolean;
  category: 'general_health' | 'medical_research' | 'public_health' | 'mental_health' | 'nutrition';
  language: string;
  country: string;
  is_active: boolean;
  last_fetched: string;
  fetch_frequency_hours: number;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  source_id: string;
  source_name: string;
  source_url: string;
  image_url?: string;
  published_at: string;
  category: string;
  tags: string[];
  scraped_at: string;
  ai_summary?: string;
  hash: string; // For deduplication
  is_active: boolean;
}

export class NewsAggregatorService {
  // Initialize default news sources
  static async initializeNewsSources(): Promise<void> {
    try {
      const existingSources = await githubDB.find(collections.news_sources, {});
      
      if (existingSources.length === 0) {
        const defaultSources = this.getDefaultSources();
        
        for (const source of defaultSources) {
          await githubDB.insert(collections.news_sources, {
            ...source,
            id: crypto.randomUUID(),
            is_active: true,
            last_fetched: new Date(0).toISOString(),
            created_at: new Date().toISOString()
          });
        }
        
        await logger.info('news_sources_initialized', 'Default news sources initialized', {
          count: defaultSources.length
        });
      }
    } catch (error) {
      await logger.error('news_sources_init_failed', 'Failed to initialize news sources', {
        error: error.message
      });
    }
  }

  private static getDefaultSources(): Partial<NewsSource>[] {
    return [
      {
        name: 'WHO Health News',
        url: 'https://www.who.int',
        rss_url: 'https://www.who.int/rss-feeds/news-english.xml',
        api_key_required: false,
        category: 'public_health',
        language: 'en',
        country: 'global',
        fetch_frequency_hours: 6
      },
      {
        name: 'CDC Health News',
        url: 'https://www.cdc.gov',
        rss_url: 'https://tools.cdc.gov/api/v2/resources/media/rss.rss',
        api_key_required: false,
        category: 'public_health',
        language: 'en',
        country: 'US',
        fetch_frequency_hours: 8
      },
      {
        name: 'PubMed Recent Research',
        url: 'https://pubmed.ncbi.nlm.nih.gov',
        rss_url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1O_tFqbDwm0vTXqhdlSuNjR3UlA4qhWC7dNlNQ9uIhPp4VPRCE/?limit=20&utm_campaign=pubmed-2&fc=20240101000000',
        api_key_required: false,
        category: 'medical_research',
        language: 'en',
        country: 'global',
        fetch_frequency_hours: 12
      },
      {
        name: 'Harvard Health',
        url: 'https://www.health.harvard.edu',
        rss_url: 'https://www.health.harvard.edu/blog/feed',
        api_key_required: false,
        category: 'general_health',
        language: 'en',
        country: 'US',
        fetch_frequency_hours: 24
      },
      {
        name: 'Mayo Clinic News',
        url: 'https://newsnetwork.mayoclinic.org',
        rss_url: 'https://newsnetwork.mayoclinic.org/feed/',
        api_key_required: false,
        category: 'general_health',
        language: 'en',
        country: 'US',
        fetch_frequency_hours: 24
      }
    ];
  }

  // Fetch news from all active sources
  static async aggregateNews(): Promise<void> {
    try {
      await logger.info('news_aggregation_started', 'Starting news aggregation');
      
      const sources = await githubDB.find(collections.news_sources, { is_active: true });
      let totalFetched = 0;
      
      for (const source of sources) {
        try {
          // Check if it's time to fetch from this source
          const lastFetched = new Date(source.last_fetched);
          const nextFetch = new Date(lastFetched.getTime() + source.fetch_frequency_hours * 60 * 60 * 1000);
          const now = new Date();
          
          if (now < nextFetch) {
            continue; // Skip this source
          }
          
          const articles = await this.fetchFromSource(source);
          totalFetched += articles.length;
          
          // Update last fetched time
          await githubDB.update(collections.news_sources, source.id, {
            last_fetched: now.toISOString()
          });
          
          await logger.info('source_fetch_completed', 'Fetched from news source', {
            source_name: source.name,
            articles_count: articles.length
          });
        } catch (error) {
          await logger.error('source_fetch_failed', 'Failed to fetch from source', {
            source_name: source.name,
            error: error.message
          });
        }
      }
      
      await logger.info('news_aggregation_completed', 'News aggregation completed', {
        total_articles: totalFetched
      });
    } catch (error) {
      await logger.error('news_aggregation_failed', 'News aggregation failed', {
        error: error.message
      });
    }
  }

  private static async fetchFromSource(source: NewsSource): Promise<NewsArticle[]> {
    if (source.rss_url) {
      return await this.fetchFromRSS(source);
    }
    // Could extend to support API endpoints
    return [];
  }

  private static async fetchFromRSS(source: NewsSource): Promise<NewsArticle[]> {
    try {
      // Fetch RSS feed
      const response = await fetch(source.rss_url!, {
        headers: {
          'User-Agent': 'CareConnect-NewsBot/1.0 (Healthcare News Aggregator)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xmlText = await response.text();
      const articles = await this.parseRSSFeed(xmlText, source);
      
      // Store articles with deduplication
      const savedArticles: NewsArticle[] = [];
      
      for (const article of articles) {
        const existing = await githubDB.find(collections.news_articles, {
          hash: article.hash
        });
        
        if (existing.length === 0) {
          // Generate AI summary if possible
          if (article.content) {
            try {
              article.ai_summary = await this.generateAISummary(article.content);
            } catch (error) {
              await logger.warn('ai_summary_failed', 'Failed to generate AI summary', {
                article_title: article.title,
                error: error.message
              });
            }
          }
          
          const saved = await githubDB.insert(collections.news_articles, article);
          savedArticles.push(saved);
        }
      }
      
      return savedArticles;
    } catch (error) {
      await logger.error('rss_fetch_failed', 'RSS feed fetch failed', {
        source_name: source.name,
        rss_url: source.rss_url,
        error: error.message
      });
      return [];
    }
  }

  private static async parseRSSFeed(xmlText: string, source: NewsSource): Promise<NewsArticle[]> {
    // Simple RSS parser (in production, use a proper XML parser)
    const articles: NewsArticle[] = [];
    
    try {
      // Extract items using regex (basic implementation)
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      const items = xmlText.match(itemRegex) || [];
      
      for (const itemXml of items.slice(0, 10)) { // Limit to 10 items per source
        const title = this.extractXMLContent(itemXml, 'title');
        const description = this.extractXMLContent(itemXml, 'description');
        const link = this.extractXMLContent(itemXml, 'link');
        const pubDate = this.extractXMLContent(itemXml, 'pubDate');
        
        if (title && link) {
          const content = this.cleanHTMLContent(description || '');
          const hash = await this.generateContentHash(title + link);
          
          articles.push({
            id: crypto.randomUUID(),
            title: this.cleanHTMLContent(title),
            excerpt: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
            content,
            source_id: source.id,
            source_name: source.name,
            source_url: link,
            published_at: this.parseDate(pubDate),
            category: source.category,
            tags: [source.category.replace('_', ' ')],
            scraped_at: new Date().toISOString(),
            hash,
            is_active: true
          });
        }
      }
    } catch (error) {
      await logger.error('rss_parse_failed', 'RSS parsing failed', {
        source_name: source.name,
        error: error.message
      });
    }
    
    return articles;
  }

  private static extractXMLContent(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private static cleanHTMLContent(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private static parseDate(dateStr: string): string {
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private static async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static async generateAISummary(content: string): Promise<string> {
    try {
      // Get system API key (not user BYOK for automated summarization)
      const apiKeys = (import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || '').split(',').map(key => key.trim()).filter(key => key.length > 0);
      const apiKey = apiKeys[0]; // Use first available key
      if (!apiKey) {
        return '';
      }

      const prompt = `Summarize this health news article in 2-3 sentences, focusing on key health implications and actionable insights for the general public:\n\n${content.substring(0, 2000)}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } catch (error) {
      await logger.warn('ai_summary_generation_failed', 'AI summary generation failed', {
        error: error.message
      });
    }
    
    return '';
  }

  // Get news feed with filters
  static async getNewsFeed(filters: {
    category?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    articles: NewsArticle[];
    total: number;
  }> {
    try {
      let query: Record<string, any> = { is_active: true };
      
      if (filters.category) {
        query.category = filters.category;
      }
      
      let articles = await githubDB.find(collections.news_articles, query);
      
      // Apply search filter
      if (filters.query) {
        const searchQuery = filters.query.toLowerCase();
        articles = articles.filter(article =>
          article.title.toLowerCase().includes(searchQuery) ||
          article.excerpt.toLowerCase().includes(searchQuery) ||
          (article.ai_summary && article.ai_summary.toLowerCase().includes(searchQuery)) ||
          article.tags.some(tag => tag.toLowerCase().includes(searchQuery))
        );
      }
      
      // Sort by published date (newest first)
      articles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      
      const total = articles.length;
      const offset = filters.offset || 0;
      const limit = filters.limit || 25;
      
      articles = articles.slice(offset, offset + limit);
      
      return { articles, total };
    } catch (error) {
      await logger.error('get_news_feed_failed', 'Failed to get news feed', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  // Subscribe to newsletter
  static async subscribeToNewsletter(email: string): Promise<void> {
    try {
      const existing = await githubDB.find(collections.newsletter_subscriptions, { email });
      
      if (existing.length === 0) {
        await githubDB.insert(collections.newsletter_subscriptions, {
          id: crypto.randomUUID(),
          email,
          subscribed_at: new Date().toISOString(),
          is_active: true,
          preferences: {
            frequency: 'weekly',
            categories: ['general_health', 'public_health']
          }
        });
        
        await logger.info('newsletter_subscription_created', 'Newsletter subscription created', {
          email
        });
      }
    } catch (error) {
      await logger.error('newsletter_subscription_failed', 'Newsletter subscription failed', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  // Get article by ID
  static async getArticle(articleId: string): Promise<NewsArticle | null> {
    try {
      return await githubDB.findById(collections.news_articles, articleId);
    } catch (error) {
      await logger.error('get_article_failed', 'Failed to get article', {
        article_id: articleId,
        error: error.message
      });
      return null;
    }
  }

  // Clean up old articles (keep last 30 days)
  static async cleanupOldArticles(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldArticles = await githubDB.find(collections.news_articles, {
        scraped_at: { $lt: thirtyDaysAgo.toISOString() }
      });
      
      for (const article of oldArticles) {
        await githubDB.delete(collections.news_articles, article.id);
      }
      
      await logger.info('news_cleanup_completed', 'Old articles cleaned up', {
        deleted_count: oldArticles.length
      });
    } catch (error) {
      await logger.error('news_cleanup_failed', 'News cleanup failed', {
        error: error.message
      });
    }
  }
}