import { useState, useEffect } from 'react';
import GoogleMap from './GoogleMap';
import { HealthcareEntity, EntityType } from '../lib/entities';
import { githubDB as dbHelpers, collections } from '../lib/database';

interface DirectoryMapViewProps {
  initialEntities?: HealthcareEntity[];
  filters?: {
    entityType?: EntityType;
    specialties?: string[];
    searchQuery?: string;
    // Add more filters as needed
  };
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  onEntitySelect?: (entity: HealthcareEntity) => void;
}

const DirectoryMapView = ({
  initialEntities,
  filters,
  centerLat,
  centerLng,
  zoom,
  onEntitySelect
}: DirectoryMapViewProps) => {
  const [entities, setEntities] = useState<HealthcareEntity[]>(initialEntities || []);
  const [loading, setLoading] = useState<boolean>(!initialEntities);
  const [error, setError] = useState<string | null>(null);

  // Fetch entities when filters change
  useEffect(() => {
    // If initialEntities are provided and no filters, use them directly
    if (initialEntities && !filters) {
      setEntities(initialEntities);
      return;
    }

    async function fetchEntities() {
      setLoading(true);
      setError(null);

      try {
        // Build filter query
        const filterQuery: Record<string, any> = {
          is_active: true,
          verification_status: 'verified'
        };

        if (filters?.entityType) {
          filterQuery.entity_type = filters.entityType;
        }

        const fetchedEntities = await dbHelpers.find(collections.entities, filterQuery);

        // Apply client-side filtering for more complex filters
        let filteredEntities = fetchedEntities;

        // Filter by search query
        if (filters?.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filteredEntities = filteredEntities.filter(entity =>
            entity.name.toLowerCase().includes(query) ||
            entity.description.toLowerCase().includes(query) ||
            entity.services.some((s: string) => s.toLowerCase().includes(query)) ||
            entity.specialties.some((s: string) => s.toLowerCase().includes(query))
          );
        }

        // Filter by specialties
        if (filters?.specialties && filters.specialties.length > 0) {
          filteredEntities = filteredEntities.filter(entity =>
            filters.specialties!.some(specialty =>
              entity.specialties.includes(specialty)
            )
          );
        }

        setEntities(filteredEntities);
      } catch (err) {
        console.error('Error fetching entities:', err);
        setError('Failed to load healthcare providers. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchEntities();
  }, [initialEntities, filters]);

  const handleMarkerClick = (entity: HealthcareEntity) => {
    if (onEntitySelect) {
      onEntitySelect(entity);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] flex justify-center items-center bg-gray-100 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading healthcare providers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-700 text-lg font-semibold mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="w-full p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-blue-700 text-lg font-semibold mb-2">No Results Found</h3>
        <p className="text-blue-600">
          No healthcare providers match your current filters. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden">
      <GoogleMap
        entities={entities}
        centerLat={centerLat}
        centerLng={centerLng}
        zoom={zoom}
        onMarkerClick={handleMarkerClick}
      />
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          Showing {entities.length} healthcare provider{entities.length !== 1 ? 's' : ''} on the map.
        </p>
      </div>
    </div>
  );
};

export default DirectoryMapView;
