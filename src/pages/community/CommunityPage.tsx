import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ForumService, ForumQuestion, ForumCategory } from '../../lib/forum';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { MessageSquare, Plus, Search, TrendingUp, Users, Eye, MessageCircle, Star, Filter } from 'lucide-react';

const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [featuredQuestions, setFeaturedQuestions] = useState<ForumQuestion[]>([]);
  const [trendingQuestions, setTrendingQuestions] = useState<ForumQuestion[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<ForumQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'recent' | 'trending' | 'unanswered' | 'featured'>('recent');

  useEffect(() => {
    loadData();
    ForumService.initializeDefaultCategories();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [searchTerm, selectedCategory, activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allQuestions, allCategories, featured, trending, unanswered] = await Promise.all([
        ForumService.getQuestions({ limit: 50 }),
        ForumService.getCategories(),
        ForumService.getQuestions({ featured: true, limit: 5 }),
        ForumService.getTrendingQuestions(10),
        ForumService.getUnansweredQuestions(10)
      ]);

      setQuestions(allQuestions);
      setCategories(allCategories);
      setFeaturedQuestions(featured);
      setTrendingQuestions(trending);
      setUnansweredQuestions(unanswered);
    } catch (error) {
      console.error('Failed to load community data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterQuestions = async () => {
    try {
      let filteredQuestions: ForumQuestion[];

      switch (activeTab) {
        case 'trending':
          filteredQuestions = trendingQuestions;
          break;
        case 'unanswered':
          filteredQuestions = unansweredQuestions;
          break;
        case 'featured':
          filteredQuestions = featuredQuestions;
          break;
        default:
          filteredQuestions = await ForumService.getQuestions({
            category_id: selectedCategory || undefined,
            search: searchTerm || undefined,
            limit: 20
          });
      }

      setQuestions(filteredQuestions);
    } catch (error) {
      console.error('Failed to filter questions:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterQuestions();
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Star className="w-4 h-4 text-red-500" />;
      case 'high':
        return <Star className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <MessageSquare className="w-12 h-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Health Q&A Community</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Get expert answers to your health questions from verified doctors and healthcare professionals
          </p>
        </div>

        {/* Action Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </form>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white dark:bg-gray-700"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ask Question Button */}
            <Link
              to="/community/new"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Ask Question
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-6">
                  {[
                    { key: 'recent', label: 'Recent', icon: MessageSquare },
                    { key: 'trending', label: 'Trending', icon: TrendingUp },
                    { key: 'unanswered', label: 'Unanswered', icon: MessageCircle },
                    { key: 'featured', label: 'Featured', icon: Star }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
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

              {/* Questions List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {questions.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No questions found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Be the first to ask a question in this category!
                    </p>
                    <Link
                      to="/community/new"
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
                    >
                      Ask Question
                    </Link>
                  </div>
                ) : (
                  questions.map((question) => (
                    <div key={question.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPriorityIcon(question.priority)}
                            <Link
                              to={`/community/${question.id}`}
                              className="text-lg font-medium text-gray-900 dark:text-white hover:text-primary"
                            >
                              {question.title}
                            </Link>
                            {question.featured && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Featured
                              </span>
                            )}
                            {question.has_accepted_answer && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Solved
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {question.content.substring(0, 200)}...
                          </p>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {question.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {question.answer_count} answers
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {question.is_anonymous ? 'Anonymous' : question.author_name}
                            </span>
                            <span>{getTimeSince(question.created_at)}</span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {question.category_name}
                            </span>
                            {question.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.name}</span>
                      <span className="text-sm opacity-75">{category.question_count}</span>
                    </div>
                    <p className="text-sm opacity-75 mt-1">{category.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Community Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Questions</span>
                  <span className="font-semibold">{questions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
                  <span className="font-semibold text-orange-600">{unansweredQuestions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Featured</span>
                  <span className="font-semibold text-yellow-600">{featuredQuestions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;