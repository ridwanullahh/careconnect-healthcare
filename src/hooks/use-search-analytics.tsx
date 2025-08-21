// Search Analytics Hook
import { useState, useRef } from 'react';

interface SearchAnalytics {
  query: string;
  timestamp: number;
  results_count: number;
  selected_result?: {
    id: string;
    type: string;
    title: string;
    position: number;
  };
  filters_used?: string[];
  session_id: string;
}

export const useSearchAnalytics = () => {
  const [sessionId] = useState(() => crypto.randomUUID());
  const analyticsQueue = useRef<SearchAnalytics[]>([]);
  
  const trackSearch = (query: string, resultsCount: number, filtersUsed?: string[]) => {
    const event: SearchAnalytics = {
      query: query.toLowerCase().trim(),
      timestamp: Date.now(),
      results_count: resultsCount,
      filters_used: filtersUsed?.filter(f => !!f),
      session_id: sessionId
    };
    
    analyticsQueue.current.push(event);
    
    // Persist to localStorage for analytics
    try {
      const stored = localStorage.getItem('careconnect_search_analytics') || '[]';
      const analytics = JSON.parse(stored);
      analytics.push(event);
      
      // Keep only last 100 searches to prevent localStorage bloat
      if (analytics.length > 100) {
        analytics.splice(0, analytics.length - 100);
      }
      
      localStorage.setItem('careconnect_search_analytics', JSON.stringify(analytics));
    } catch (error) {
      console.warn('Failed to store search analytics:', error);
    }
  };
  
  const trackResultClick = (query: string, result: any, position: number) => {
    const lastSearch = analyticsQueue.current
      .filter(a => a.query.toLowerCase() === query.toLowerCase())
      .pop();
      
    if (lastSearch) {
      lastSearch.selected_result = {
        id: result.id,
        type: result.type,
        title: result.title,
        position
      };
    }
    
    // Update stored analytics
    try {
      const stored = localStorage.getItem('careconnect_search_analytics') || '[]';
      const analytics = JSON.parse(stored);
      const searchIndex = analytics.findLastIndex((a: SearchAnalytics) => 
        a.query.toLowerCase() === query.toLowerCase() && a.session_id === sessionId
      );
      
      if (searchIndex >= 0) {
        analytics[searchIndex].selected_result = {
          id: result.id,
          type: result.type,
          title: result.title,
          position
        };
        localStorage.setItem('careconnect_search_analytics', JSON.stringify(analytics));
      }
    } catch (error) {
      console.warn('Failed to update search analytics:', error);
    }
  };
  
  const getPopularSearches = (): string[] => {
    try {
      const stored = localStorage.getItem('careconnect_search_analytics') || '[]';
      const analytics: SearchAnalytics[] = JSON.parse(stored);
      
      // Count search frequency over last 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const recentSearches = analytics.filter(a => a.timestamp > thirtyDaysAgo);
      
      const searchCounts = recentSearches.reduce((acc, search) => {
        const query = search.query.toLowerCase().trim();
        if (query.length > 2) {
          acc[query] = (acc[query] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      // Return top searches sorted by frequency
      return Object.entries(searchCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([query]) => query);
    } catch (error) {
      console.warn('Failed to get popular searches:', error);
      return [];
    }
  };
  
  const getSearchStats = () => {
    try {
      const stored = localStorage.getItem('careconnect_search_analytics') || '[]';
      const analytics: SearchAnalytics[] = JSON.parse(stored);
      
      const total = analytics.length;
      const withResults = analytics.filter(a => a.results_count > 0).length;
      const withClicks = analytics.filter(a => a.selected_result).length;
      
      return {
        totalSearches: total,
        successRate: total > 0 ? (withResults / total) * 100 : 0,
        clickThroughRate: withResults > 0 ? (withClicks / withResults) * 100 : 0,
        popularSearches: getPopularSearches()
      };
    } catch (error) {
      console.warn('Failed to get search stats:', error);
      return {
        totalSearches: 0,
        successRate: 0,
        clickThroughRate: 0,
        popularSearches: []
      };
    }
  };
  
  return {
    trackSearch,
    trackResultClick,
    getPopularSearches,
    getSearchStats,
    sessionId
  };
};