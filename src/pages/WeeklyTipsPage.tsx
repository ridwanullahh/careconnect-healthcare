import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WeeklyTipsService, WeeklyTip } from '../lib/news';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Calendar, Eye, Heart, Tag, Clock, TrendingUp } from 'lucide-react';

const WeeklyTipsPage: React.FC = () => {
  const [tips, setTips] = useState<WeeklyTip[]>([]);
  const [featuredTips, setFeaturedTips] = useState<WeeklyTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date().getWeek());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadTips();
  }, [selectedCategory]);

  const loadTips = async () => {
    setIsLoading(true);
    try {
      const [allTips, featured] = await Promise.all([
        WeeklyTipsService.getPublishedTips(),
        WeeklyTipsService.getPublishedTips(5)
      ]);

      let filteredTips = allTips;
      if (selectedCategory) {
        filteredTips = allTips.filter(tip => tip.category === selectedCategory);
      }

      setTips(filteredTips);
      setFeaturedTips(featured.filter(tip => tip.featured));
    } catch (error) {
      console.error('Failed to load tips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    'general', 'nutrition', 'exercise', 'mental-health', 'prevention', 'wellness'
  ];

  const getWeeklyTip = (week: number, year: number) => {
    return tips.find(tip => tip.week_number === week && tip.year === year);
  };

  const getCurrentWeekTip = () => {
    return getWeeklyTip(currentWeek, currentYear);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentTip = getCurrentWeekTip();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Calendar className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Weekly Health Tips</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover practical health advice and wellness tips to improve your daily life, updated every week
          </p>
        </div>

        {/* Current Week Tip */}
        {currentTip && (
          <div className="bg-gradient-to-r from-primary via-primary/90 to-accent rounded-lg p-8 mb-12 text-white">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6" />
              <span className="text-lg font-semibold">This Week's Tip</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                Week {currentTip.week_number}, {currentTip.year}
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-4">{currentTip.title}</h2>
            <p className="text-lg opacity-90 mb-6">{currentTip.content}</p>
            <div className="flex items-center gap-4 text-sm opacity-75">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {currentTip.views} views
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {currentTip.likes} likes
              </span>
              <span className="bg-white/20 px-2 py-1 rounded">
                {currentTip.category}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Category Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Filter by Category</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    !selectedCategory
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Tips
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg transition-colors capitalize ${
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

            {/* Tips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tips.map((tip) => (
                <div key={tip.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  {tip.image_url && (
                    <img
                      src={tip.image_url}
                      alt={tip.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-sm text-gray-500">
                        Week {tip.week_number}, {tip.year}
                      </span>
                      {tip.featured && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          Featured
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                      {tip.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {tip.content}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {tip.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {tip.likes}
                        </span>
                      </div>
                      
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium capitalize">
                        {tip.category.replace('-', ' ')}
                      </span>
                    </div>

                    {tip.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tip.tags.slice(0, 3).map((tag, index) => (
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

            {tips.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No tips found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedCategory 
                    ? `No tips available in the ${selectedCategory.replace('-', ' ')} category.`
                    : 'No weekly tips are currently available.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Featured Tips */}
            {featuredTips.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Featured Tips</h3>
                <div className="space-y-4">
                  {featuredTips.map((tip) => (
                    <div key={tip.id} className="border-l-4 border-primary pl-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {tip.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {tip.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        Week {tip.week_number}, {tip.year}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Tips</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{tips.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">This Week</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Week {currentWeek}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Featured</span>
                  <span className="font-semibold text-yellow-600">{featuredTips.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add getWeek method to Date prototype if not already defined
if (!Date.prototype.getWeek) {
  Date.prototype.getWeek = function() {
    const firstDayOfYear = new Date(this.getFullYear(), 0, 1);
    const pastDaysOfYear = (this.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };
}

export default WeeklyTipsPage;