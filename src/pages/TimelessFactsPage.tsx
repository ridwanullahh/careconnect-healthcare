import React, { useState, useEffect } from 'react';
import { TimelessFactsService, TimelessFact } from '../lib/news';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Lightbulb, Eye, Heart, Tag, Brain, Apple, Shield, Activity } from 'lucide-react';

const TimelessFactsPage: React.FC = () => {
  const [facts, setFacts] = useState<TimelessFact[]>([]);
  const [featuredFacts, setFeaturedFacts] = useState<TimelessFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFactType, setSelectedFactType] = useState('');

  useEffect(() => {
    loadFacts();
  }, [selectedCategory, selectedFactType]);

  const loadFacts = async () => {
    setIsLoading(true);
    try {
      const [allFacts, featured] = await Promise.all([
        TimelessFactsService.getPublishedFacts(),
        TimelessFactsService.getPublishedFacts(6)
      ]);

      let filteredFacts = allFacts;
      if (selectedCategory) {
        filteredFacts = filteredFacts.filter(fact => fact.category === selectedCategory);
      }
      if (selectedFactType) {
        filteredFacts = filteredFacts.filter(fact => fact.fact_type === selectedFactType);
      }

      setFacts(filteredFacts);
      setFeaturedFacts(featured.filter(fact => fact.featured));
    } catch (error) {
      console.error('Failed to load facts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    'general', 'anatomy', 'physiology', 'nutrition', 'exercise', 
    'mental-health', 'prevention', 'wellness', 'medical-history'
  ];

  const factTypes = [
    { key: 'medical', label: 'Medical', icon: Activity, color: 'text-red-500' },
    { key: 'nutrition', label: 'Nutrition', icon: Apple, color: 'text-green-500' },
    { key: 'wellness', label: 'Wellness', icon: Heart, color: 'text-blue-500' },
    { key: 'prevention', label: 'Prevention', icon: Shield, color: 'text-purple-500' },
    { key: 'general', label: 'General', icon: Brain, color: 'text-gray-500' }
  ];

  const getFactTypeIcon = (type: string) => {
    const factType = factTypes.find(ft => ft.key === type);
    if (!factType) return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    
    const IconComponent = factType.icon;
    return <IconComponent className={`w-5 h-5 ${factType.color}`} />;
  };

  const getFactTypeColor = (type: string) => {
    switch (type) {
      case 'medical': return 'bg-red-100 text-red-800';
      case 'nutrition': return 'bg-green-100 text-green-800';
      case 'wellness': return 'bg-blue-100 text-blue-800';
      case 'prevention': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Lightbulb className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Timeless Health Facts</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover fascinating and enduring health facts that will expand your knowledge and understanding of the human body
          </p>
        </div>

        {/* Featured Facts Carousel */}
        {featuredFacts.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-8 mb-12 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Featured Facts</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredFacts.slice(0, 3).map((fact) => (
                <div key={fact.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {getFactTypeIcon(fact.fact_type)}
                    <span className="text-sm font-medium opacity-90 capitalize">
                      {fact.fact_type.replace('-', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{fact.title}</h3>
                  <p className="text-sm opacity-90 line-clamp-3">{fact.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Filter */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Filter by Category</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedCategory
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors capitalize ${
                          selectedCategory === category
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fact Type Filter */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Filter by Type</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedFactType('')}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedFactType
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Types
                    </button>
                    {factTypes.map((type) => (
                      <button
                        key={type.key}
                        onClick={() => setSelectedFactType(type.key)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                          selectedFactType === type.key
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Facts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {facts.map((fact) => (
                <div key={fact.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  {fact.image_url && (
                    <img
                      src={fact.image_url}
                      alt={fact.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      {getFactTypeIcon(fact.fact_type)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFactTypeColor(fact.fact_type)}`}>
                        {fact.fact_type.replace('-', ' ')}
                      </span>
                      {fact.featured && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          Featured
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {fact.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {fact.content}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {fact.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {fact.likes}
                        </span>
                      </div>
                      
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium capitalize">
                        {fact.category.replace('-', ' ')}
                      </span>
                    </div>

                    {fact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-4">
                        {fact.tags.slice(0, 4).map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {facts.length === 0 && (
              <div className="text-center py-12">
                <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No facts found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedCategory || selectedFactType
                    ? 'No facts match your current filters. Try adjusting your selection.'
                    : 'No timeless facts are currently available.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Fact Types Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fact Types</h3>
              <div className="space-y-3">
                {factTypes.map((type) => {
                  const count = facts.filter(fact => fact.fact_type === type.key).length;
                  return (
                    <div key={type.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${type.color}`} />
                        <span className="text-sm font-medium">{type.label}</span>
                      </div>
                      <span className="text-sm text-gray-500">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Facts</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{facts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Featured</span>
                  <span className="font-semibold text-yellow-600">{featuredFacts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Categories</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{categories.length}</span>
                </div>
              </div>
            </div>

            {/* Did You Know */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Did You Know?</h3>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                The human brain contains approximately 86 billion neurons, each connected to thousands of others, 
                creating a network more complex than any computer ever built!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelessFactsPage;