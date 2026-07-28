// Search Suggestions Component with Enhanced Auto-complete
import React, { useState, useEffect } from 'react';
import { Search, Clock, TrendingUp, Star, MapPin, Stethoscope, Heart, GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';

// Popular search terms (can be loaded from analytics later)
const POPULAR_SEARCHES = [
  { term: 'mental health', category: 'specialty', icon: '🧠', count: 1250 },
  { term: 'family medicine', category: 'specialty', icon: '👨‍⚕️', count: 980 },
  { term: 'pediatrics', category: 'specialty', icon: '👶', count: 756 },
  { term: 'cardiology', category: 'specialty', icon: '❤️', count: 642 },
  { term: 'pharmacy near me', category: 'location', icon: '💊', count: 589 },
  { term: 'telehealth services', category: 'feature', icon: '📱', count: 523 },
  { term: 'covid-19 testing', category: 'service', icon: '🦠', count: 487 },
  { term: 'urgent care', category: 'service', icon: '🚨', count: 456 },
  { term: 'bmi calculator', category: 'tool', icon: '📊', count: 398 },
  { term: 'nutrition counseling', category: 'service', icon: '🥗', count: 367 }
];

// Trending searches (simulated - would come from real analytics)
const TRENDING_SEARCHES = [
  { term: 'ai symptom checker', growth: '+45%', icon: '🤖' },
  { term: 'mental health support', growth: '+32%', icon: '🧠' },
  { term: 'telehealth consultation', growth: '+28%', icon: '📱' },
  { term: 'preventive care', growth: '+25%', icon: '🛡️' },
  { term: 'health screening', growth: '+19%', icon: '🔍' }
];

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  className?: string;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  onSelect,
  onClose,
  className
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  useEffect(() => {
    const stored = localStorage.getItem('careconnect_recent_searches');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 8));
        }
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);
  
  // Filter suggestions based on query
  const filteredPopular = POPULAR_SEARCHES
    .filter(item => 
      query.length === 0 || 
      item.term.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 6);
    
  const filteredRecent = recentSearches
    .filter(term => 
      query.length === 0 || 
      term.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5);
    
  const showTrending = query.length === 0;
  const showRecent = filteredRecent.length > 0;
  const showPopular = filteredPopular.length > 0;
  
  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    onClose();
  };
  
  // Don't render if no suggestions to show
  if (!showTrending && !showRecent && !showPopular) {
    return null;
  }
  
  return (
    <div className={cn(
      "absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto",
      className
    )}>
      {/* Recent Searches */}
      {showRecent && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <Clock className="w-3 h-3 mr-1" />
            Recent Searches
          </div>
          <div className="space-y-1">
            {filteredRecent.map((term, index) => (
              <button
                key={`recent-${index}`}
                onClick={() => handleSelect(term)}
                className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 transition-colors"
              >
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{term}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Trending Searches */}
      {showTrending && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <TrendingUp className="w-3 h-3 mr-1" />
            Trending Now
          </div>
          <div className="space-y-1">
            {TRENDING_SEARCHES.slice(0, 4).map((trend, index) => (
              <button
                key={`trend-${index}`}
                onClick={() => handleSelect(trend.term)}
                className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <span className="text-base mr-2">{trend.icon}</span>
                    <span className="truncate">{trend.term}</span>
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {trend.growth}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Popular Searches */}
      {showPopular && (
        <div className="p-3">
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <Star className="w-3 h-3 mr-1" />
            Popular Searches
          </div>
          <div className="grid grid-cols-1 gap-1">
            {filteredPopular.map((item, index) => (
              <button
                key={`popular-${index}`}
                onClick={() => handleSelect(item.term)}
                className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <span className="text-base mr-2">{item.icon}</span>
                    <div className="flex flex-col">
                      <span className="truncate">{item.term}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Tips */}
      {query.length === 0 && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
          💡 <strong>Pro tip:</strong> Try searching by condition ("diabetes"), location ("near me"), or service type ("urgent care")
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;