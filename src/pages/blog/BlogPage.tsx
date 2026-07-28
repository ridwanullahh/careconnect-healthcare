// Blog Archive - Healthcare Articles & News
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  User, 
  Tag, 
  Filter, 
  Heart,
  MessageSquare,
  Share2,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { BlogService, BlogPost } from '../../lib/blog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState('newest');

  const categories = [
    { id: 'health-tips', name: 'Health Tips', color: 'bg-green-100 text-green-600' },
    { id: 'medical-news', name: 'Medical News', color: 'bg-blue-100 text-blue-600' },
    { id: 'wellness', name: 'Wellness', color: 'bg-purple-100 text-purple-600' },
    { id: 'nutrition', name: 'Nutrition', color: 'bg-yellow-100 text-yellow-600' },
    { id: 'mental-health', name: 'Mental Health', color: 'bg-pink-100 text-pink-600' },
    { id: 'prevention', name: 'Prevention', color: 'bg-teal-100 text-teal-600' },
    { id: 'technology', name: 'Health Tech', color: 'bg-indigo-100 text-indigo-600' }
  ];

  useEffect(() => {
    loadPosts();
  }, [selectedCategory, sortBy]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const fetchedPosts = await BlogService.getPosts({
        query: searchQuery,
        category: selectedCategory,
        sortBy: sortBy as any,
      });
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Failed to load blog posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => 
    !searchQuery || 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    post.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredPosts = filteredPosts.filter(post => post.isFeatured).slice(0, 3);
  const regularPosts = filteredPosts.filter(post => !post.isFeatured);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
              Health & Wellness Blog
              <span className="block text-primary">Expert Insights & Tips</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Stay informed with the latest health news, expert advice, and wellness tips 
              from verified healthcare professionals.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, topics, or authors..."
                  className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center mb-6">
              <TrendingUp className="w-6 h-6 text-primary mr-2" />
              <h2 className="text-2xl font-bold text-dark">Featured Articles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredPosts.map((post) => {
                const categoryInfo = getCategoryInfo(post.category);
                return (
                  <Link
                    key={post.id}
                    to={`/blog/${post.id}`}
                    className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative">
                      <img
                        src={post.featuredImage || '/images/placeholder-blog.jpg'}
                        alt={post.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryInfo.color}`}>
                          {categoryInfo.name}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4 bg-primary text-white px-2 py-1 rounded text-xs font-medium">
                        Featured
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-dark mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(post.publishedAt)}
                          </div>
                          <div className="flex items-center">
                            <Heart className="w-4 h-4 mr-1" />
                            {post.likes}
                          </div>
                        </div>
                        <span className="text-primary font-medium">{post.readTime} min read</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories and Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8 space-y-6">
              {/* Categories */}
              <div>
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
                    All Articles
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
                      <span className="text-sm">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Sort Options */}
              <div>
                <h3 className="text-lg font-semibold text-dark mb-4">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                  <option value="likes">Most Liked</option>
                  <option value="comments">Most Discussed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content - Blog Posts */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 mt-4">Loading articles...</p>
              </div>
            ) : regularPosts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-dark">
                    {selectedCategory ? getCategoryInfo(selectedCategory).name : 'All Articles'}
                  </h2>
                  <p className="text-gray-600">{regularPosts.length} articles</p>
                </div>
                
                <div className="space-y-8">
                  {regularPosts.map(post => {
                    const categoryInfo = getCategoryInfo(post.category);
                    return (
                      <article key={post.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="md:flex">
                          <div className="md:w-1/3">
                            <img
                              src={post.featuredImage || '/images/placeholder-blog.jpg'}
                              alt={post.title}
                              className="w-full h-48 md:h-full object-cover"
                            />
                          </div>
                          <div className="p-6 md:w-2/3">
                            <div className="flex items-center space-x-4 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                                {categoryInfo.name}
                              </span>
                              <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(post.publishedAt)}
                              </div>
                              <span className="text-sm text-gray-500">{post.readTime} min read</span>
                            </div>
                            
                            <h2 className="text-xl font-semibold text-dark mb-3 hover:text-primary transition-colors">
                              <Link to={`/blog/${post.id}`}>{post.title}</Link>
                            </h2>
                            
                            <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  {post.author.avatar && (
                                    <img
                                      src={post.author.avatar}
                                      alt={post.author.name}
                                      className="w-8 h-8 rounded-full mr-2"
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
                                    {post.author.credentials && (
                                      <p className="text-xs text-gray-600">{post.author.credentials}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Heart className="w-4 h-4 mr-1" />
                                  {post.likes}
                                </div>
                                <div className="flex items-center">
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  {post.commentsCount}
                                </div>
                                <Link
                                  to={`/blog/${post.id}`}
                                  className="flex items-center text-primary hover:text-primary/80 font-medium"
                                >
                                  Read More
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;