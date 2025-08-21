import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { NewsService, NewsArticle } from '../lib/news';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

const HealthNewsArticlePage: React.FC = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (articleId) {
      loadArticle(articleId);
    }
  }, [articleId]);

  const loadArticle = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedArticle = await NewsService.getArticle(id);
      if (fetchedArticle) {
        setArticle(fetchedArticle);
      } else {
        setError('Article not found.');
      }
    } catch (err) {
      setError('Failed to load article.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error}</h2>
        <Link to="/health-news" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Back to News Feed
        </Link>
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <div className="bg-light py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/health-news" className="inline-flex items-center text-primary mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to News Feed
        </Link>
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-4xl font-bold text-dark mb-4">{article.title}</h1>
          <div className="text-sm text-gray-500 mb-6">
            <span>{new Date(article.published_at).toLocaleDateString()}</span> | 
            <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="ml-1 hover:underline">{article.source}</a>
          </div>
          {article.image_url && <img src={article.image_url} alt={article.title} className="w-full h-auto rounded-lg mb-6" />}
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
      </div>
    </div>
  );
};

export default HealthNewsArticlePage;