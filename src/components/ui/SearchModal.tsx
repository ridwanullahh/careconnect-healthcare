import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Loader2, 
  MapPin, 
  Star,
  Clock,
  Stethoscope,
  Heart,
  GraduationCap,
  ShoppingBag,
  Calculator,
  Filter,
  ChevronDown,
  Activity,
  Mic,
  Share2,
  Tag,
  Globe,
  CheckSquare,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useAjaxSearch, SearchResult, SearchFilters } from '../../hooks/use-ajax-search';
import { useSearchAnalytics } from '../../hooks/use-search-analytics';
import SearchSuggestions from './SearchSuggestions';
import { cn } from '../../lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { 
    query, 
    setQuery, 
    results, 
    isLoading, 
    error, 
    totalCount,
    filters,
    updateFilter,
    resetFilters
  } = useAjaxSearch('');
  
  const {
    trackSearch,
    trackResultClick,
    getPopularSearches
  } = useSearchAnalytics();
  
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Track search analytics when results change
  useEffect(() => {
    if (query.length >= 2 && !isLoading) {
      const activeFilters = Object.entries(filters)
        .filter(([_, value]) => !!value)
        .map(([key, value]) => `${key}:${value}`);
      
      trackSearch(query, results.length, activeFilters);
    }
  }, [query, results.length, isLoading, filters, trackSearch]);

  // Load search history from localStorage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('searchHistory');
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          setSearchHistory(parsedHistory.slice(0, 5));
        }
      } catch (e) {
        console.error('Failed to parse search history', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
      setSelectedIndex(-1);
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
      setSelectedIndex(-1);
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, setQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          } else if (query.trim()) {
            handleSearch();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, query]);

  const handleSearch = () => {
    if (query.trim()) {
      // Add to search history
      const newHistory = [query, ...searchHistory.filter(item => item !== query)];
      setSearchHistory(newHistory.slice(0, 5));
      localStorage.setItem('searchHistory', JSON.stringify(newHistory.slice(0, 5)));
      
      // Navigate to directory with search query
      navigate(`/directory?search=${encodeURIComponent(query)}`);
      onClose();
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    // Track result click analytics
    const resultIndex = results.findIndex(r => r.id === result.id && r.type === result.type);
    if (resultIndex >= 0) {
      trackResultClick(query, result, resultIndex);
    }
    
    // Add to search history if it's a search term
    if (query.trim()) {
      const newHistory = [query, ...searchHistory.filter(item => item !== query)];
      setSearchHistory(newHistory.slice(0, 5));
      localStorage.setItem('searchHistory', JSON.stringify(newHistory.slice(0, 5)));
    }
    
    // Navigate to result URL
    navigate(result.url);
    onClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entity': return <Stethoscope className="w-4 h-4" />;
      case 'tool': return <Calculator className="w-4 h-4" />;
      case 'course': return <GraduationCap className="w-4 h-4" />;
      case 'cause': return <Heart className="w-4 h-4" />;
      case 'news': return <Activity className="w-4 h-4" />;
      case 'podcast': return <Mic className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'entity': return 'bg-green-100 text-green-800';
      case 'tool': return 'bg-blue-100 text-blue-800';
      case 'course': return 'bg-purple-100 text-purple-800';
      case 'cause': return 'bg-red-100 text-red-800';
      case 'news': return 'bg-yellow-100 text-yellow-800';
      case 'podcast': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'entity': return 'Provider';
      case 'tool': return 'Health Tool';
      case 'course': return 'Course';
      case 'cause': return 'Cause';
      case 'news': return 'News';
      case 'podcast': return 'Podcast';
      default: return type;
    }
  };

  // Memoize filter options to avoid recalculation
  const filterOptions = useMemo(() => {
    return {
      types: [
        { value: '', label: 'All Types', icon: Search },
        { value: 'entity', label: 'Healthcare Providers', icon: Stethoscope },
        { value: 'tool', label: 'Health Tools', icon: Calculator },
        { value: 'course', label: 'Courses', icon: GraduationCap },
        { value: 'cause', label: 'Causes', icon: Heart },
      ],
      categories: {
        entity: [
          { value: 'health_center', label: 'Health Centers' },
          { value: 'hospital', label: 'Hospitals' },
          { value: 'clinic', label: 'Clinics' },
          { value: 'pharmacy', label: 'Pharmacies' },
          { value: 'practitioner', label: 'Practitioners' },
        ],
        tool: [
          { value: 'general_triage', label: 'General Triage' },
          { value: 'nutrition', label: 'Nutrition' },
          { value: 'mental_wellness', label: 'Mental Wellness' },
          { value: 'maternal_health', label: 'Maternal Health' },
          { value: 'chronic_conditions', label: 'Chronic Conditions' },
          { value: 'fitness', label: 'Fitness' },
        ],
        course: [
          { value: 'medical', label: 'Medical' },
          { value: 'wellness', label: 'Wellness' },
          { value: 'nutrition', label: 'Nutrition' },
          { value: 'mental_health', label: 'Mental Health' },
        ],
        cause: [
          { value: 'medical', label: 'Medical' },
          { value: 'research', label: 'Research' },
          { value: 'community', label: 'Community' },
          { value: 'emergency', label: 'Emergency' },
        ],
      },
      ratings: [
        { value: 0, label: 'Any Rating' },
        { value: 3, label: '3+ Stars' },
        { value: 4, label: '4+ Stars' },
        { value: 4.5, label: '4.5+ Stars' },
      ],
      prices: [
        { value: 'all', label: 'All Prices' },
        { value: 'free', label: 'Free Only' },
        { value: 'paid', label: 'Paid Only' },
      ],
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose} 
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16">
        <div 
          ref={modalRef}
          className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl transform transition-all"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-modal-title"
        >
          {/* Search Header */}
          <div className="flex items-center p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.length === 0) {
                    setShowSuggestions(true);
                  } else {
                    setShowSuggestions(false);
                  }
                }}
                onFocus={() => {
                  if (query.length === 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Search healthcare providers, tools, courses, and more..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white text-base md:text-lg"
                aria-label="Search"
              />

              {/* Search Suggestions */}
              {showSuggestions && query.length === 0 && (
                <SearchSuggestions
                  query={query}
                  onSelect={(suggestion) => {
                    setQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                  onClose={() => setShowSuggestions(false)}
                />
              )}
            </div>

            <div className="flex items-center ml-4 space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  Object.keys(filters).some(k => !!filters[k as keyof SearchFilters])
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                aria-label="Toggle filters"
                title="Search filters"
              >
                <Filter className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                <button
                  onClick={() => {
                    resetFilters();
                    // Keep filters panel open
                  }}
                  className="text-sm text-primary hover:text-primary/80 dark:text-primary-light dark:hover:text-primary-light/80"
                >
                  Reset All
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={filters.type || ''}
                    onChange={(e) => updateFilter('type', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {filterOptions.types.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter (dynamic based on type) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!filters.type}
                  >
                    <option value="">All Categories</option>
                    {filters.type && filterOptions.categories[filters.type as keyof typeof filterOptions.categories]?.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Rating
                  </label>
                  <select
                    value={filters.rating || 0}
                    onChange={(e) => updateFilter('rating', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {filterOptions.ratings.map((rating) => (
                      <option key={rating.value} value={rating.value}>
                        {rating.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Filter (for courses and tools) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <select
                    value={filters.price || 'all'}
                    onChange={(e) => updateFilter('price', e.target.value as SearchFilters['price'])}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={filters.type !== 'course' && filters.type !== 'tool'}
                  >
                    {filterOptions.prices.map((price) => (
                      <option key={price.value} value={price.value}>
                        {price.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters */}
              {Object.keys(filters).some(k => !!filters[k as keyof SearchFilters]) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(filters).map(([key, value]) => {
                    if (!value) return null;
                    
                    let label = '';
                    
                    // Generate human-readable label based on filter type
                    if (key === 'type' && typeof value === 'string') {
                      const type = filterOptions.types.find(t => t.value === value);
                      label = type ? type.label : value;
                    } else if (key === 'category' && typeof value === 'string') {
                      if (filters.type) {
                        const category = filterOptions.categories[filters.type as keyof typeof filterOptions.categories]?.find(c => c.value === value);
                        label = category ? category.label : value;
                      } else {
                        label = value;
                      }
                    } else if (key === 'rating' && typeof value === 'number') {
                      label = `${value}+ Stars`;
                    } else if (key === 'price' && typeof value === 'string') {
                      const price = filterOptions.prices.find(p => p.value === value);
                      label = price ? price.label : value;
                    } else {
                      label = String(value);
                    }
                    
                    return (
                      <div 
                        key={key} 
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs flex items-center"
                      >
                        <span>{key}: {label}</span>
                        <button
                          onClick={() => updateFilter(key as keyof SearchFilters, undefined)}
                          className="ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          aria-label={`Remove ${key} filter`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Searching...</span>
              </div>
            )}

            {error && (
              <div className="py-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error}</p>
                <button 
                  onClick={() => setQuery(query)}
                  className="mt-2 text-primary hover:text-primary/80 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {!isLoading && !error && query.length >= 2 && results.length === 0 && (
              <div className="py-12 text-center">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">No results found for "{query}"</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Try different keywords or check your filters</p>
                
                {Object.keys(filters).some(k => !!filters[k as keyof SearchFilters]) && (
                  <button
                    onClick={resetFilters}
                    className="mt-4 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className={`px-4 md:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                  >
                    <Link
                      to={result.url}
                      onClick={() => handleResultSelect(result)}
                      className="block"
                    >
                      <div className="flex items-start space-x-3">
                        {/* Result Image (if available) */}
                        {result.imageUrl ? (
                          <div className="flex-shrink-0 h-12 w-12 rounded-md overflow-hidden">
                            <img 
                              src={result.imageUrl} 
                              alt={result.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-10 w-10 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {getTypeIcon(result.type)}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-md font-semibold text-gray-900 dark:text-white truncate">
                              {result.title}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(result.type)}`}>
                              {getTypeLabel(result.type)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                            {result.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {result.rating && (
                              <div className="flex items-center">
                                <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                                <span>{result.rating}</span>
                              </div>
                            )}
                            
                            {result.location && (
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                <span>{result.location}</span>
                              </div>
                            )}
                            
                            {result.category && (
                              <div className="flex items-center">
                                <Tag className="w-3 h-3 mr-1" />
                                <span>{result.category}</span>
                              </div>
                            )}
                            
                            {result.tags && result.tags.length > 0 && (
                              <div className="flex items-center">
                                <Globe className="w-3 h-3 mr-1" />
                                <span className="truncate max-w-[150px]">
                                  {result.tags.slice(0, 2).join(', ')}
                                  {result.tags.length > 2 && '...'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 self-center">
                          <Zap className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {query.length > 0 && query.length < 2 && (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <p>Type at least 2 characters to search</p>
              </div>
            )}
            
            {query.length === 0 && !showSuggestions && (
              <div className="py-12 text-center">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Search the CareConnect platform</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['Healthcare Providers', 'Mental Health', 'Nutrition', 'COVID-19', 'Telehealth'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuery(suggestion)}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <span>Use <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs">↑↓</kbd> to navigate</span>
                  <span><kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs">Enter</kbd> to select</span>
                  <span><kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs">Esc</kbd> to close</span>
                </div>
                <Link
                  to={`/directory?search=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="text-primary hover:text-primary/80 dark:text-primary-light dark:hover:text-primary-light/80 font-medium"
                >
                  View all results →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;