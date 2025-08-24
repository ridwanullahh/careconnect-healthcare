import React, { useState, useEffect } from 'react';
import { useToastService } from '../../lib/toast-service';
import { NewsService, NewsArticle, NewsSource } from '../../lib/news';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Rss, Settings } from 'lucide-react';

const NewsManagementPage: React.FC = () => {
  const toast = useToastService();
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'sources' | 'create'>('articles');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'ai_generated'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    source: 'CareConnect',
    source_url: '',
    image_url: '',
    category: 'general',
    tags: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    featured: false,
    is_ai_generated: false
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let fetchedArticles: NewsArticle[];
      
      switch (filter) {
        case 'pending':
          fetchedArticles = await NewsService.getAllArticles({ status: 'pending_approval' });
          break;
        case 'approved':
          fetchedArticles = await NewsService.getAllArticles({ admin_approved: true });
          break;
        case 'ai_generated':
          fetchedArticles = await NewsService.getAllArticles({ is_ai_generated: true });
          break;
        default:
          fetchedArticles = await NewsService.getAllArticles();
      }
      
      setArticles(fetchedArticles);
      
      if (activeTab === 'sources') {
        const fetchedSources = await NewsService.getNewsSources();
        setSources(fetchedSources);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const articleData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      };

      if (editingArticle) {
        await NewsService.updateArticle(editingArticle.id, articleData);
      } else {
        await NewsService.createArticle(articleData, user.id);
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Failed to save article:', error);
      toast.showSuccess('Failed to save article. Please try again.');
    }
  };

  const handleApprove = async (articleId: string) => {
    try {
      await NewsService.approveArticle(articleId, 'Approved by admin');
      await loadData();
    } catch (error) {
      console.error('Failed to approve article:', error);
    }
  };

  const handleReject = async (articleId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await NewsService.rejectArticle(articleId, reason);
      await loadData();
    } catch (error) {
      console.error('Failed to reject article:', error);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      await NewsService.deleteArticle(articleId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  const handleEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      source: article.source,
      source_url: article.source_url,
      image_url: article.image_url || '',
      category: article.category,
      tags: article.tags.join(', '),
      status: article.status,
      featured: article.featured,
      is_ai_generated: article.is_ai_generated
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      source: 'CareConnect',
      source_url: '',
      image_url: '',
      category: 'general',
      tags: '',
      status: 'draft',
      featured: false,
      is_ai_generated: false
    });
    setEditingArticle(null);
    setShowCreateForm(false);
  };

  const triggerAIAggregation = async () => {
    try {
      await NewsService.aggregateNewsFromSources();
      toast.showSuccess('AI news aggregation started. Check back in a few minutes for new articles.');
      await loadData();
    } catch (error) {
      console.error('Failed to trigger AI aggregation:', error);
      toast.showSuccess('Failed to start AI aggregation. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">News Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage health news articles and AI aggregation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={triggerAIAggregation}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Rss className="w-5 h-5" />
            Run AI Aggregation
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Article
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'articles', label: 'Articles', icon: Eye },
              { key: 'sources', label: 'News Sources', icon: Rss },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingArticle ? 'Edit Article' : 'Create New Article'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="general">General Health</option>
                  <option value="medical">Medical News</option>
                  <option value="research">Research</option>
                  <option value="wellness">Wellness</option>
                  <option value="nutrition">Nutrition</option>
                  <option value="mental-health">Mental Health</option>
                  <option value="technology">Health Technology</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Source URL</label>
                <input
                  type="url"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="health, news, medical"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="mr-2"
                />
                Featured Article
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_ai_generated}
                  onChange={(e) => setFormData({ ...formData, is_ai_generated: e.target.checked })}
                  className="mr-2"
                />
                AI Generated
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                {editingArticle ? 'Update Article' : 'Create Article'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <>
          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'all', label: 'All Articles' },
                  { key: 'pending', label: 'Pending Approval' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'ai_generated', label: 'AI Generated' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      filter === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Articles List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Articles ({articles.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {article.title}
                              {article.is_ai_generated && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  AI Generated
                                </span>
                              )}
                              {article.featured && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Featured
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {article.excerpt.substring(0, 100)}...
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(article.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{article.source}</div>
                        <div className="text-sm text-gray-500">{article.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          article.admin_approved && article.status === 'published' ? 'bg-green-100 text-green-800' :
                          article.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                          article.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {article.admin_approved && article.status === 'published' ? 'Approved' : article.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Eye className="w-4 h-4 mr-1" />
                          {article.views || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {!article.admin_approved && article.status === 'pending_approval' && (
                            <>
                              <button
                                onClick={() => handleApprove(article.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(article.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleEdit(article)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">News Sources ({sources.length})</h2>
              <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Source
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map((source) => (
                <div key={source.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{source.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      source.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {source.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{source.url}</p>
                  <p className="text-xs text-gray-500">Category: {source.category}</p>
                  <p className="text-xs text-gray-500">Language: {source.language}</p>
                  {source.last_fetched && (
                    <p className="text-xs text-gray-500">Last fetched: {new Date(source.last_fetched).toLocaleDateString()}</p>
                  )}
                  <div className="flex justify-end mt-3 space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsManagementPage;
