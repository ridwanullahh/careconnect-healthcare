import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { NewsService, NewsArticle } from '../../lib/news';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const NewsManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const allArticles = await NewsService.getNewsFeed({});
      setArticles(allArticles);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleDeleteArticle = async (articleId: string) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      await NewsService.deleteArticle(articleId);
      fetchArticles();
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">News Management</h2>
        <Link to="/news/create" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Create New Article
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {articles.length === 0 ? (
            <p>No articles found. Create your first article!</p>
          ) : (
            articles.map(article => (
              <div key={article.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-dark">{article.title}</h3>
                  <p className="text-sm text-gray-600">
                    Source: {article.source}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/news/edit/${article.id}`} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                    Edit
                  </Link>
                  <button onClick={() => handleDeleteArticle(article.id)} className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsManagementPage;
