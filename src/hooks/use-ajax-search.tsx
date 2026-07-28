// AJAX Search Hook
import { useState, useEffect, useRef } from 'react';
import { debounce } from '../lib/utils';
import { githubDB, collections } from '../lib/database';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'entity' | 'tool' | 'course' | 'cause' | 'news' | 'podcast';
  category?: string;
  rating?: number;
  location?: string;
  icon?: React.ReactNode;
  url: string;
  tags?: string[];
  imageUrl?: string;
}

export interface SearchFilters {
  type?: string;
  category?: string;
  location?: string;
  rating?: number;
  tags?: string[];
  specialties?: string[];
  languages?: string[];
  features?: string[];
  price?: 'free' | 'paid' | 'all';
}

export const useAjaxSearch = (initialQuery: string = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const searchCache = useRef<Map<string, SearchResult[]>>(new Map());
  
  // Create a debounced search function
  const debouncedSearch = useRef(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (searchQuery.length < 2 && !Object.keys(searchFilters).some(k => !!searchFilters[k as keyof SearchFilters])) {
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
        return;
      }

      // Create cache key from query and filters
      const cacheKey = JSON.stringify({ q: searchQuery, f: searchFilters });
      
      // Check cache first
      if (searchCache.current.has(cacheKey)) {
        const cachedResults = searchCache.current.get(cacheKey)!;
        setResults(cachedResults);
        setTotalCount(cachedResults.length);
        setHasMore(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Search filters for each type
        const entityFilters: any = {};
        const toolFilters: any = {};
        const courseFilters: any = {};
        const causeFilters: any = {};
        
        // Apply type filter
        const shouldSearchEntities = !searchFilters.type || searchFilters.type === 'entity';
        const shouldSearchTools = !searchFilters.type || searchFilters.type === 'tool';
        const shouldSearchCourses = !searchFilters.type || searchFilters.type === 'course';
        const shouldSearchCauses = !searchFilters.type || searchFilters.type === 'cause';
        const shouldSearchNews = !searchFilters.type || searchFilters.type === 'news';
        const shouldSearchPodcasts = !searchFilters.type || searchFilters.type === 'podcast';
        
        // Apply category filters if present
        if (searchFilters.category) {
          entityFilters.entity_type = searchFilters.category;
          toolFilters.category = searchFilters.category;
          courseFilters.category = searchFilters.category;
          causeFilters.category = searchFilters.category;
        }
        
        // Apply specialty filters (for entities)
        if (searchFilters.specialties && searchFilters.specialties.length > 0) {
          entityFilters.specialties = searchFilters.specialties;
        }
        
        // Apply language filters (for entities)
        if (searchFilters.languages && searchFilters.languages.length > 0) {
          entityFilters.languages = searchFilters.languages;
        }
        
        // Apply feature filters (for entities)
        if (searchFilters.features && searchFilters.features.length > 0) {
          entityFilters.features = searchFilters.features;
        }
        
        // Apply rating filter (minimum rating)
        if (searchFilters.rating && searchFilters.rating > 0) {
          entityFilters.rating_min = searchFilters.rating;
          toolFilters.rating_min = searchFilters.rating;
          courseFilters.rating_min = searchFilters.rating;
        }
        
        // Apply price filter (for courses and tools)
        if (searchFilters.price) {
          if (searchFilters.price === 'free') {
            courseFilters.is_free = true;
            toolFilters.is_free = true;
          } else if (searchFilters.price === 'paid') {
            courseFilters.is_free = false;
            toolFilters.is_free = false;
          }
        }
        
        // Apply tags filter
        if (searchFilters.tags && searchFilters.tags.length > 0) {
          toolFilters.tags = searchFilters.tags;
          courseFilters.tags = searchFilters.tags;
          causeFilters.tags = searchFilters.tags;
        }
        
        // Make parallel search requests
        const searchPromises = [];
        
        if (shouldSearchEntities) {
          searchPromises.push(githubDB.find(collections.entities, entityFilters));
        } else {
          searchPromises.push(Promise.resolve([]));
        }
        
        if (shouldSearchTools) {
          searchPromises.push(githubDB.find(collections.health_tools, toolFilters));
        } else {
          searchPromises.push(Promise.resolve([]));
        }
        
        if (shouldSearchCourses) {
          searchPromises.push(githubDB.find(collections.courses, courseFilters));
        } else {
          searchPromises.push(Promise.resolve([]));
        }
        
        if (shouldSearchCauses) {
          searchPromises.push(githubDB.find(collections.causes, causeFilters));
        } else {
          searchPromises.push(Promise.resolve([]));
        }
        
        if (shouldSearchNews) {
          searchPromises.push(githubDB.find(collections.news_articles, {}).catch(() => []));
        } else {
          searchPromises.push(Promise.resolve([]));
        }
        
        if (shouldSearchPodcasts) {
          searchPromises.push(githubDB.find(collections.podcasts, {}).catch(() => []));
        } else {
          searchPromises.push(Promise.resolve([]));
        }
        
        const [entities, tools, courses, causes, news, podcasts] = await Promise.all(searchPromises);
        
        // Filter results by search query if present
        const filteredEntities = searchQuery ? 
          entities.filter(entity => 
            entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entity.specialties?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : entities;
        
        const filteredTools = searchQuery ? 
          tools.filter(tool => 
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : tools;
        
        const filteredCourses = searchQuery ? 
          courses.filter(course => 
            course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : courses;
        
        const filteredCauses = searchQuery ? 
          causes.filter(cause => 
            cause.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cause.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cause.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          ) : causes;
        
        // Filter news and podcasts. Real records from news_articles / podcasts
        // may use varied field names, so guard every access with optional
        // chaining and a fallback to an empty string.
        const lowerQuery = searchQuery.toLowerCase();
        const filteredNews = searchQuery
          ? news.filter((article: any) => {
              const title = (article.title || '').toLowerCase();
              const description =
                (article.description || article.summary || article.excerpt || '').toLowerCase();
              const tags = Array.isArray(article.tags) ? article.tags : [];
              return (
                title.includes(lowerQuery) ||
                description.includes(lowerQuery) ||
                tags.some((tag: string) => String(tag).toLowerCase().includes(lowerQuery))
              );
            })
          : news;

        const filteredPodcasts = searchQuery
          ? podcasts.filter((podcast: any) => {
              const title = (podcast.title || '').toLowerCase();
              const description =
                (podcast.description || podcast.summary || '').toLowerCase();
              const tags = Array.isArray(podcast.tags) ? podcast.tags : [];
              return (
                title.includes(lowerQuery) ||
                description.includes(lowerQuery) ||
                tags.some((tag: string) => String(tag).toLowerCase().includes(lowerQuery))
              );
            })
          : podcasts;
        
        // Format results
        const entityResults = filteredEntities.map(entity => ({
          id: entity.id,
          title: entity.name,
          description: entity.description || '',
          type: 'entity' as const,
          category: entity.entity_type,
          rating: entity.rating,
          location: entity.address ? `${entity.address.city}, ${entity.address.state}` : undefined,
          url: `/directory/${entity.id}`,
          tags: entity.specialties || [],
          imageUrl: entity.logo_url
        }));
        
        const toolResults = filteredTools.map(tool => ({
          id: tool.id,
          title: tool.name,
          description: tool.description || '',
          type: 'tool' as const,
          category: tool.category,
          rating: tool.rating,
          url: `/health-tools/${tool.id}`,
          tags: tool.tags || []
        }));
        
        const courseResults = filteredCourses.map(course => ({
          id: course.id,
          title: course.title || '',
          description: course.description || '',
          type: 'course' as const,
          category: course.category,
          rating: course.rating,
          url: `/courses/${course.id}`,
          tags: course.tags || [],
          imageUrl: course.thumbnail_url
        }));
        
        const causeResults = filteredCauses.map(cause => ({
          id: cause.id,
          title: cause.title || '',
          description: cause.description || '',
          type: 'cause' as const,
          category: cause.category,
          url: `/causes/${cause.id}`,
          tags: cause.tags || [],
          imageUrl: cause.image_url
        }));
        
        const newsResults = filteredNews.map((article: any) => ({
          id: String(article.id ?? article.uid ?? ''),
          title: article.title || 'Untitled Article',
          description: article.description || article.summary || article.excerpt || '',
          type: 'news' as const,
          category: article.category,
          url: article.url || article.source_url || `/health-news-feed`,
          tags: Array.isArray(article.tags) ? article.tags : []
        }));

        const podcastResults = filteredPodcasts.map((podcast: any) => ({
          id: String(podcast.id ?? podcast.uid ?? ''),
          title: podcast.title || 'Untitled Episode',
          description: podcast.description || podcast.summary || '',
          type: 'podcast' as const,
          category: podcast.category,
          url: `/health-talk-podcast`,
          tags: Array.isArray(podcast.tags) ? podcast.tags : []
        }));
        
        // Combine and sort results by relevance (if query) or rating
        let combinedResults = [...entityResults, ...toolResults, ...courseResults, ...causeResults, ...newsResults, ...podcastResults];
        
        // If there's a search query, sort by relevance (exact matches first)
        if (searchQuery) {
          combinedResults.sort((a, b) => {
            const aExactMatch = a.title.toLowerCase() === searchQuery.toLowerCase();
            const bExactMatch = b.title.toLowerCase() === searchQuery.toLowerCase();
            
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;
            
            const aStartsWith = a.title.toLowerCase().startsWith(searchQuery.toLowerCase());
            const bStartsWith = b.title.toLowerCase().startsWith(searchQuery.toLowerCase());
            
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            
            // If same match type, use rating as tiebreaker
            return (b.rating || 0) - (a.rating || 0);
          });
        } else {
          // Otherwise sort by rating
          combinedResults.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        
        // Cache the results
        searchCache.current.set(cacheKey, combinedResults);
        
        // Update state
        setResults(combinedResults);
        setTotalCount(combinedResults.length);
        setHasMore(false); // Currently, we load all results at once
      } catch (err) {
        console.error('Search failed:', err);
        setError('Search failed. Please try again.');
        setResults([]);
        setTotalCount(0);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    }, 300) // 300ms debounce delay
  ).current;
  
  // Trigger search when query or filters change
  useEffect(() => {
    debouncedSearch(query, filters);
  }, [query, filters]);
  
  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      searchCache.current.clear();
    };
  }, []);
  
  // Helper function to update individual filters
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  // Reset all filters
  const resetFilters = () => {
    setFilters({});
  };
  
  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    totalCount,
    hasMore,
    filters,
    updateFilter,
    resetFilters
  };
};
