import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NewsService, NewsArticle } from '../lib/news';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Rss, Search, Mail } from 'lucide-react';

const HealthNewsFeedPage: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedArticles = await NewsService.getNewsFeed({ query: searchTerm });
      setArticles(fetchedArticles);
    } catch (err) {
      setError('Failed to load news feed.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadNews();
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    try {
      await NewsService.subscribeToNewsletter(email);
      alert('Successfully subscribed to the newsletter!');
      setEmail('');
    } catch (err) {
      alert('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-light min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <Rss className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-4xl font-bold text-dark mb-2">Health News Feed</h1>
          <p className="text-lg text-gray-600">Your daily source for the latest in health and wellness, powered by AI.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {error && <p className="text-red-500">{error}</p>}
            <div className="space-y-6">
              {articles.map(article => (
                <div key={article.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                  <h2 className="text-2xl font-bold text-dark mb-2">{article.title}</h2>
                  <div className="text-sm text-gray-500 mb-4">
                    <span>{new Date(article.published_at).toLocaleDateString()}</span> | <span>{article.source}</span>
                  </div>
                  <p className="text-gray-700 mb-4">{article.ai_summary}</p>
                  <Link to={`/health-news/${article.id}`} className="text-primary font-semibold hover:underline">
                    Read Full Article
                  </Link>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-dark mb-4">Search News</h3>
              <form onSubmit={handleSearch} className="flex mb-6">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search news..."
                  className="w-full p-2 border border-gray-300 rounded-l-md focus:ring-primary focus:border-primary"
                />
                <button type="submit" className="bg-primary text-white p-2 rounded-r-md">
                  <Search className="w-5 h-5" />
                </button>
              </form>

              <h3 className="text-lg font-semibold text-dark mb-4">Subscribe to Newsletter</h3>
              <form onSubmit={handleSubscribe}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:ring-primary focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthNewsFeedPage;