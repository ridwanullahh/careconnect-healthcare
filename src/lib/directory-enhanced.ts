// Enhanced Directory Service with Geosearch, Clustering, and Advanced Filters
import { githubDB, collections } from './database';
import { HealthcareEntity, EntityType, BadgeType } from './entities';
import { logger } from './observability';

export interface GeosearchFilter {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface DirectoryFilter {
  entityType?: EntityType;
  specialties?: string[];
  searchQuery?: string;
  insuranceAccepted?: string[];
  languages?: string[];
  openNow?: boolean;
  telehealth?: boolean;
  rating?: number;
  priceRange?: 'budget' | 'standard' | 'premium';
  badges?: BadgeType[];
  geosearch?: GeosearchFilter;
}

export interface EntityCluster {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  entities: HealthcareEntity[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export class EnhancedDirectoryService {
  // Haversine distance calculation
  private static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Check if entity is currently open
  private static isOpenNow(entity: HealthcareEntity): boolean {
    if (!entity.hours) return false;
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
    
    const todayHours = entity.hours[currentDay as keyof typeof entity.hours];
    if (!todayHours || todayHours === 'closed') return false;
    
    // Parse hours like "09:00-17:00"
    const [open, close] = todayHours.split('-');
    const openTime = parseInt(open.replace(':', ''));
    const closeTime = parseInt(close.replace(':', ''));
    
    return currentTime >= openTime && currentTime <= closeTime;
  }

  // Enhanced search with all filters
  static async searchEntities(filters: DirectoryFilter): Promise<{
    entities: HealthcareEntity[];
    clusters: EntityCluster[];
    totalCount: number;
  }> {
    try {
      await logger.info('directory_search', 'Enhanced directory search initiated', filters);

      // Base query
      let query: Record<string, any> = {
        is_active: true,
        verification_status: 'verified'
      };

      // Entity type filter
      if (filters.entityType) {
        query.entity_type = filters.entityType;
      }

      // Fetch all matching entities
      let entities = await githubDB.find(collections.entities, query);

      // Apply client-side filters
      entities = this.applyClientFilters(entities, filters);

      // Apply geosearch if provided
      if (filters.geosearch) {
        entities = this.applyGeosearch(entities, filters.geosearch);
      }

      // Sort by relevance/distance
      entities = this.sortEntities(entities, filters);

      // Generate clusters for map view
      const clusters = this.generateClusters(entities);

      await logger.info('directory_search_completed', 'Search completed', {
        total_found: entities.length,
        clusters_generated: clusters.length
      });

      return {
        entities,
        clusters,
        totalCount: entities.length
      };
    } catch (error) {
      await logger.error('directory_search_failed', 'Enhanced directory search failed', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  private static applyClientFilters(entities: HealthcareEntity[], filters: DirectoryFilter): HealthcareEntity[] {
    return entities.filter(entity => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          entity.name,
          entity.description,
          ...(entity.services || []),
          ...(entity.specialties || [])
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }

      // Specialties filter
      if (filters.specialties && filters.specialties.length > 0) {
        const hasSpecialty = filters.specialties.some(specialty =>
          entity.specialties?.includes(specialty)
        );
        if (!hasSpecialty) return false;
      }

      // Insurance filter
      if (filters.insuranceAccepted && filters.insuranceAccepted.length > 0) {
        const acceptsInsurance = filters.insuranceAccepted.some(insurance =>
          entity.insurance_accepted?.includes(insurance)
        );
        if (!acceptsInsurance) return false;
      }

      // Languages filter
      if (filters.languages && filters.languages.length > 0) {
        const speaksLanguage = filters.languages.some(language =>
          entity.languages?.includes(language)
        );
        if (!speaksLanguage) return false;
      }

      // Open now filter
      if (filters.openNow && !this.isOpenNow(entity)) {
        return false;
      }

      // Telehealth filter
      if (filters.telehealth && !entity.features?.telehealth) {
        return false;
      }

      // Rating filter
      if (filters.rating && (entity.rating || 0) < filters.rating) {
        return false;
      }

      // Price range filter
      if (filters.priceRange && entity.price_band !== filters.priceRange) {
        return false;
      }

      // Badges filter
      if (filters.badges && filters.badges.length > 0) {
        const hasBadge = filters.badges.some(badge =>
          entity.badges?.includes(badge)
        );
        if (!hasBadge) return false;
      }

      return true;
    });
  }

  private static applyGeosearch(entities: HealthcareEntity[], geosearch: GeosearchFilter): HealthcareEntity[] {
    return entities
      .map(entity => {
        if (!entity.latitude || !entity.longitude) return null;
        
        const distance = this.calculateDistance(
          geosearch.latitude,
          geosearch.longitude,
          entity.latitude,
          entity.longitude
        );
        
        if (distance <= geosearch.radiusKm) {
          return { ...entity, distance };
        }
        return null;
      })
      .filter(Boolean) as (HealthcareEntity & { distance: number })[];
  }

  private static sortEntities(entities: HealthcareEntity[], filters: DirectoryFilter): HealthcareEntity[] {
    return entities.sort((a, b) => {
      // Sort by distance if geosearch is applied
      if (filters.geosearch && 'distance' in a && 'distance' in b) {
        return (a as any).distance - (b as any).distance;
      }
      
      // Sort by rating
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      
      // Sort by verification badges
      const aBadges = a.badges?.length || 0;
      const bBadges = b.badges?.length || 0;
      if (aBadges !== bBadges) return bBadges - aBadges;
      
      // Sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  // Simple clustering algorithm for map view
  private static generateClusters(entities: HealthcareEntity[]): EntityCluster[] {
    const clusters: EntityCluster[] = [];
    const processed = new Set<string>();
    const CLUSTER_RADIUS_KM = 2; // Entities within 2km are clustered

    for (const entity of entities) {
      if (processed.has(entity.id) || !entity.latitude || !entity.longitude) {
        continue;
      }

      const clusterEntities: HealthcareEntity[] = [entity];
      processed.add(entity.id);

      // Find nearby entities
      for (const other of entities) {
        if (processed.has(other.id) || !other.latitude || !other.longitude) {
          continue;
        }

        const distance = this.calculateDistance(
          entity.latitude,
          entity.longitude,
          other.latitude,
          other.longitude
        );

        if (distance <= CLUSTER_RADIUS_KM) {
          clusterEntities.push(other);
          processed.add(other.id);
        }
      }

      // Calculate cluster center and bounds
      const latitudes = clusterEntities.map(e => e.latitude!);
      const longitudes = clusterEntities.map(e => e.longitude!);

      const cluster: EntityCluster = {
        id: `cluster-${entity.id}`,
        latitude: latitudes.reduce((a, b) => a + b, 0) / latitudes.length,
        longitude: longitudes.reduce((a, b) => a + b, 0) / longitudes.length,
        count: clusterEntities.length,
        entities: clusterEntities,
        bounds: {
          north: Math.max(...latitudes),
          south: Math.min(...latitudes),
          east: Math.max(...longitudes),
          west: Math.min(...longitudes)
        }
      };

      clusters.push(cluster);
    }

    return clusters;
  }

  // Save/follow entity
  static async saveEntity(userId: string, entityId: string): Promise<void> {
    try {
      const existing = await githubDB.find(collections.user_preferences, {
        user_id: userId
      });

      if (existing.length > 0) {
        const prefs = existing[0];
        const savedEntities = prefs.saved_entities || [];
        
        if (!savedEntities.includes(entityId)) {
          await githubDB.update(collections.user_preferences, prefs.id, {
            saved_entities: [...savedEntities, entityId],
            updated_at: new Date().toISOString()
          });
        }
      } else {
        await githubDB.insert(collections.user_preferences, {
          user_id: userId,
          saved_entities: [entityId],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      await logger.info('entity_saved', 'User saved entity', { entity_id: entityId }, userId);
    } catch (error) {
      await logger.error('entity_save_failed', 'Failed to save entity', {
        entity_id: entityId,
        error: error.message
      }, userId);
      throw error;
    }
  }

  // Remove saved entity
  static async unsaveEntity(userId: string, entityId: string): Promise<void> {
    try {
      const existing = await githubDB.find(collections.user_preferences, {
        user_id: userId
      });

      if (existing.length > 0) {
        const prefs = existing[0];
        const savedEntities = (prefs.saved_entities || []).filter(id => id !== entityId);
        
        await githubDB.update(collections.user_preferences, prefs.id, {
          saved_entities: savedEntities,
          updated_at: new Date().toISOString()
        });
      }

      await logger.info('entity_unsaved', 'User unsaved entity', { entity_id: entityId }, userId);
    } catch (error) {
      await logger.error('entity_unsave_failed', 'Failed to unsave entity', {
        entity_id: entityId,
        error: error.message
      }, userId);
      throw error;
    }
  }

  // Get user's saved entities
  static async getSavedEntities(userId: string): Promise<HealthcareEntity[]> {
    try {
      const prefs = await githubDB.find(collections.user_preferences, {
        user_id: userId
      });

      if (prefs.length === 0 || !prefs[0].saved_entities) {
        return [];
      }

      const savedEntityIds = prefs[0].saved_entities;
      const entities: HealthcareEntity[] = [];

      for (const entityId of savedEntityIds) {
        try {
          const entity = await githubDB.findById(collections.entities, entityId);
          if (entity && entity.is_active) {
            entities.push(entity);
          }
        } catch (error) {
          // Entity might have been deleted, skip
          continue;
        }
      }

      return entities;
    } catch (error) {
      await logger.error('get_saved_entities_failed', 'Failed to get saved entities', {
        error: error.message
      }, userId);
      return [];
    }
  }

  // Compare entities (up to 3)
  static async compareEntities(entityIds: string[]): Promise<HealthcareEntity[]> {
    if (entityIds.length > 3) {
      throw new Error('Maximum 3 entities can be compared');
    }

    const entities: HealthcareEntity[] = [];

    for (const entityId of entityIds) {
      try {
        const entity = await githubDB.findById(collections.entities, entityId);
        if (entity && entity.is_active) {
          entities.push(entity);
        }
      } catch (error) {
        // Skip invalid entities
        continue;
      }
    }

    return entities;
  }

  // Get popular searches for autocomplete
  static async getPopularSearches(): Promise<string[]> {
    try {
      // Get recent search queries from analytics
      const recentSearches = await githubDB.find(collections.analytics_events, {
        event_type: 'directory_search'
      });

      // Extract and count search terms
      const searchCounts: Record<string, number> = {};
      
      recentSearches.forEach(event => {
        if (event.event_data?.searchQuery) {
          const query = event.event_data.searchQuery.toLowerCase();
          searchCounts[query] = (searchCounts[query] || 0) + 1;
        }
      });

      // Return top 10 most popular searches
      return Object.entries(searchCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([query]) => query);
    } catch (error) {
      await logger.error('get_popular_searches_failed', 'Failed to get popular searches', {
        error: error.message
      });
      return [];
    }
  }
}