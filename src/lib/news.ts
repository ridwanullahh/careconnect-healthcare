import { githubDB, collections } from './database';

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  source: string;
  source_url: string;
  image_url: string;
  published_at: string;
  category: string;
  tags: string[];
  scraped_at: string;
  ai_summary: string;
}

export class NewsService {
  static async getNewsFeed(filters: {
    category?: string;
    query?: string;
  }): Promise<NewsArticle[]> {
    // In a real application, this would fetch from a dedicated news service
    // that performs web scraping and AI summarization.
    // For now, we will simulate this by fetching from a 'news_articles' collection.
    let articles = await githubDB.find(collections.news_articles, {});

    if (filters.category) {
      articles = articles.filter(article => article.category === filters.category);
    }

    if (filters.query) {
      const query = filters.query.toLowerCase();
      articles = articles.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.ai_summary.toLowerCase().includes(query) ||
        article.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    articles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    return articles;
  }

  static async getArticle(articleId: string): Promise<NewsArticle | null> {
    return await githubDB.findById(collections.news_articles, articleId);
  }

  static async deleteArticle(articleId: string): Promise<void> {
    await githubDB.delete(collections.news_articles, articleId);
  }

  static async subscribeToNewsletter(email: string): Promise<boolean> {
    // In a real application, this would integrate with an email marketing service.
    // For now, we'll just log the subscription.
    console.log(`Subscribing ${email} to the newsletter.`);
    await githubDB.insert(collections.newsletter_subscriptions, {
      email,
      subscribed_at: new Date().toISOString()
    });
    return true;
  }
}