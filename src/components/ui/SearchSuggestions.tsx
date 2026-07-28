// Search Suggestions Component with Enhanced Auto-complete
import React, { useState, useEffect } from 'react';
import { Search, Clock, TrendingUp, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { githubDB as dbHelpers, collections } from '../../lib/database';

// Static fallback list of real healthcare search terms. Used when the
// search_analytics collection is empty or unavailable. NO fabricated counts
// and NO emojis — just the terms themselves with a category label.
const FALLBACK_POPULAR_SEARCHES: { term: string; category: string }[] = [
  { term: 'mental health', category: 'specialty' },
  { term: 'family medicine', category: 'specialty' },
  { term: 'pediatrics', category: 'specialty' },
  { term: 'cardiology', category: 'specialty' },
  { term: 'pharmacy near me', category: 'location' },
  { term: 'telehealth services', category: 'feature' },
  { term: 'covid-19 testing', category: 'service' },
  { term: 'urgent care', category: 'service' },
  { term: 'bmi calculator', category: 'tool' },
  { term: 'nutrition counseling', category: 'service' }
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
  const [popularSearches, setPopularSearches] = useState<{ term: string; category?: string }[]>(
    FALLBACK_POPULAR_SEARCHES
  );
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

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

    let cancelled = false;
    // Fetch real popular + trending queries from search_analytics. Each query
    // record stores a `query` (string) and optionally a `count`/`timestamp`.
    // We compute the top queries client-side and use the most recent ones as
    // the "trending" list — no fabricated growth percentages.
    const loadAnalytics = async () => {
      try {
        const records = await dbHelpers.find<any>(collections.search_analytics, {}).catch(() => []);
        if (cancelled || !Array.isArray(records) || records.length === 0) return;

        // Aggregate by query string and sort by total count desc.
        const counts = new Map<string, number>();
        const latest = new Map<string, number>();
        const now = Date.now();
        records.forEach((r: any) => {
          const q = (r.query || r.term || r.search_query || '').trim();
          if (!q) return;
          const c = Number(r.count ?? 1) || 1;
          counts.set(q, (counts.get(q) || 0) + c);
          const ts = r.timestamp || r.created_at || r.searched_at;
          const tsNum = ts ? new Date(ts).getTime() || 0 : 0;
          if (tsNum > (latest.get(q) || 0)) latest.set(q, tsNum);
        });

        const popular = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([term]) => ({ term }));

        // Trending: queries searched within the last 7 days, ordered by recency.
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const trending = Array.from(latest.entries())
          .filter(([, ts]) => ts >= sevenDaysAgo)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([term]) => term);

        if (popular.length > 0) setPopularSearches(popular);
        if (trending.length > 0) setTrendingSearches(trending);
      } catch (err) {
        console.error('Failed to load search analytics:', err);
      }
    };
    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter suggestions based on query
  const filteredPopular = popularSearches
    .filter(item =>
      query.length === 0 || item.term.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 6);

  const filteredTrending = trendingSearches
    .filter(term =>
      query.length === 0 || term.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 4);

  const filteredRecent = recentSearches
    .filter(term =>
      query.length === 0 || term.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5);

  const showTrending = query.length === 0 && filteredTrending.length > 0;
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

      {/* Trending Searches (real recent queries only — no fabricated growth %) */}
      {showTrending && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <TrendingUp className="w-3 h-3 mr-1" />
            Trending This Week
          </div>
          <div className="space-y-1">
            {filteredTrending.map((term, index) => (
              <button
                key={`trend-${index}`}
                onClick={() => handleSelect(term)}
                className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{term}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Searches (real top queries — no fabricated counts) */}
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
                    <Search className="w-4 h-4 mr-2 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="truncate">{item.term}</span>
                      {item.category && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tips */}
      {query.length === 0 && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
          <strong>Pro tip:</strong> Try searching by condition ("diabetes"), location ("near me"), or service type ("urgent care").
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;
