// Community Forum - Healthcare Discussions
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  TrendingUp,
  Pin,
  Clock,
  ThumbsUp,
  Eye,
  Plus,
  Search,
  Filter,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { CommunityService, ForumPost } from '../../lib/community';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState('recent');

  const categories = [
    { id: 'general', name: 'General Health', color: 'bg-blue-100 text-blue-600', count: 45 },
    { id: 'mental-health', name: 'Mental Health', color: 'bg-purple-100 text-purple-600', count: 23 },
    { id: 'nutrition', name: 'Nutrition & Diet', color: 'bg-green-100 text-green-600', count: 34 },
    { id: 'chronic-conditions', name: 'Chronic Conditions', color: 'bg-orange-100 text-orange-600', count: 28 },
    { id: 'wellness', name: 'Wellness & Fitness', color: 'bg-teal-100 text-teal-600', count: 19 },
    { id: 'caregiving', name: 'Caregiving', color: 'bg-pink-100 text-pink-600', count: 15 },
    { id: 'support', name: 'Support Groups', color: 'bg-indigo-100 text-indigo-600', count: 12 }
  ];

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, sortBy]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const fetchedPosts = await CommunityService.getPosts({
        category: selectedCategory,
        sortBy: sortBy as any,
      });
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Failed to load forum posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = posts.filter(post =>
    !searchQuery ||
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return `${Math.floor(diffInHours * 60)} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || { name: categoryId, color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-white to-accent/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-dark mb-6">
              Community Forum
              <span className="block text-primary">Connect, Share, Support</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join thousands of community members sharing experiences, asking questions, 
              and supporting each other on their health journeys.
            </p>
            
            {/* Community Guidelines Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-4xl mx-auto mb-8">
              <div className="flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  This is a safe, moderated space. All posts are reviewed by healthcare professionals.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="relative flex-1 max-w-md mb-4 sm:mb-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search discussions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          {user && (
            <Link
              to="/community/new"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Start Discussion</span>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories and Stats */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-dark mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === '' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Discussions</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {categories.reduce((sum, cat) => sum + cat.count, 0)}
                    </span>
                  </div>
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id 
                        ? 'bg-primary text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{category.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        selectedCategory === category.id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {category.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Community Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-dark mb-4">Community Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center"><Users className="w-4 h-4 mr-2" /> Members</span>
                  <span className="font-bold text-dark">12,456</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> Discussions</span>
                  <span className="font-bold text-dark">2,890</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center"><TrendingUp className="w-4 h-4 mr-2" /> Online Now</span>
                  <span className="font-bold text-green-500">178</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Posts */}
          <div className="lg:col-span-3">
            {/* Sorting and Filters */}
            <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-600">Sort by:</span>
                <button 
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1 rounded-full text-sm ${sortBy === 'recent' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Recent
                </button>
                <button 
                  onClick={() => setSortBy('popular')}
                  className={`px-3 py-1 rounded-full text-sm ${sortBy === 'popular' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Popular
                </button>
              </div>
              <button className="flex items-center space-x-2 text-primary text-sm font-medium">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-4">
                {filteredPosts.map(post => {
                  const categoryInfo = getCategoryInfo(post.category);
                  return (
                    <div key={post.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${categoryInfo.color}`}>
                              {categoryInfo.name}
                            </span>
                            {post.is_pinned && <Pin className="w-4 h-4 text-yellow-500" />}
                            {post.is_locked && <AlertCircle className="w-4 h-4 text-red-500" />}
                          </div>
                          <Link to={`/community/post/${post.id}`} className="block">
                            <h2 className="text-xl font-bold text-dark hover:text-primary transition-colors">
                              {post.title}
                            </h2>
                          </Link>
                          <p className="text-sm text-gray-500 mt-1">
                            by <span className="font-medium text-gray-700">{post.author_name}</span>
                          </p>
                        </div>
                        <div className="flex-shrink-0 mt-4 sm:mt-0">
                          <p className="text-sm text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1" /> {formatDate(post.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center"><ThumbsUp className="w-4 h-4 mr-1" /> {post.likes}</span>
                          <span className="flex items-center"><MessageSquare className="w-4 h-4 mr-1" /> {post.reply_count}</span>
                          <span className="flex items-center"><Eye className="w-4 h-4 mr-1" /> {post.view_count}</span>
                        </div>
                        <Link to={`/community/post/${post.id}`} className="text-primary font-medium hover:underline">
                          Read More
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-dark">No discussions found</h3>
                <p className="text-gray-500 mt-2">
                  Be the first to start a conversation in this category!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;