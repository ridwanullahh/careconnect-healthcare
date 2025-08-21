import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { HealthcareEntity } from '../lib/entities';

interface MapProps {
  entities: HealthcareEntity[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  onMarkerClick?: (entity: HealthcareEntity) => void;
}

const containerStyle = {
  width: '100%',
  height: '600px'
};

const MAP_DEFAULT_SETTINGS = {
  center: {
    lat: 34.0522, // Los Angeles by default
    lng: -118.2437
  },
  zoom: 12
};

const GoogleMapComponent = ({
  entities,
  centerLat,
  centerLng,
  zoom = 12,
  onMarkerClick
}: MapProps) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Show fallback if no API key
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return (
      <div className="w-full h-[600px] bg-gray-100 rounded-lg flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Map View Unavailable</h3>
        <p className="text-gray-600 mb-4">Google Maps API key is not configured.</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
          <p className="text-sm text-yellow-800">
            To enable map functionality, add your Google Maps API key to the environment variables.
            <br /><br />
            See .env.example for setup instructions.
          </p>
        </div>
        <div className="mt-6 text-left bg-white rounded-lg p-4 max-w-md">
          <h4 className="font-medium text-gray-800 mb-2">Showing {entities.length} providers:</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {entities.slice(0, 5).map(entity => (
              <div key={entity.id} className="text-sm">
                <div className="font-medium text-gray-700">{entity.name}</div>
                <div className="text-gray-500">
                  {entity.address ? `${entity.address.city}, ${entity.address.state}` : 'Address not available'}
                </div>
              </div>
            ))}
            {entities.length > 5 && (
              <div className="text-xs text-gray-500">...and {entities.length - 5} more</div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<HealthcareEntity | null>(null);
  
  const center = {
    lat: centerLat || MAP_DEFAULT_SETTINGS.center.lat,
    lng: centerLng || MAP_DEFAULT_SETTINGS.center.lng
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (entity: HealthcareEntity) => {
    setSelectedEntity(entity);
    if (onMarkerClick) {
      onMarkerClick(entity);
    }
  };

  const closeInfoWindow = () => {
    setSelectedEntity(null);
  };

  // Calculate map bounds to fit all markers when entities change
  useEffect(() => {
    if (map && entities.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      entities.forEach(entity => {
        if (entity.address && entity.address.coordinates) {
          bounds.extend({
            lat: entity.address.coordinates.lat,
            lng: entity.address.coordinates.lng
          });
        }
      });
      
      // Only adjust bounds if we have valid coordinates
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
        // Don't zoom in too far on small areas
        const listener = google.maps.event.addListener(map, 'idle', () => {
          if (map.getZoom() > 16) {
            map.setZoom(16);
          }
          google.maps.event.removeListener(listener);
        });
      }
    }
  }, [map, entities]);

  if (loadError) {
    return <div className="p-4 bg-red-100 text-red-700 rounded">Error loading Google Maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-[600px] bg-gray-100 rounded">
      <div className="animate-pulse text-gray-600">Loading Maps...</div>
    </div>;
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
        }}
      >
        {/* Markers for each healthcare entity */}
        {entities.map(entity => {
          if (!entity.address || !entity.address.coordinates) return null;
          
          return (
            <Marker
              key={entity.id}
              position={{
                lat: entity.address.coordinates.lat,
                lng: entity.address.coordinates.lng
              }}
              onClick={() => handleMarkerClick(entity)}
              icon={{
                url: getMarkerIconByType(entity.entity_type),
                scaledSize: new google.maps.Size(30, 30)
              }}
              title={entity.name}
            />
          );
        })}

        {/* Info Window for selected entity */}
        {selectedEntity && selectedEntity.address && selectedEntity.address.coordinates && (
          <InfoWindow
            position={{
              lat: selectedEntity.address.coordinates.lat,
              lng: selectedEntity.address.coordinates.lng
            }}
            onCloseClick={closeInfoWindow}
          >
            <div className="p-2 max-w-[300px]">
              <h3 className="font-bold text-lg mb-1">{selectedEntity.name}</h3>
              <p className="text-sm text-gray-700 mb-2">{selectedEntity.entity_type.replace('_', ' ')}</p>
              
              <div className="flex items-center text-sm mb-2">
                <span className="text-yellow-500 mr-1">★</span>
                <span>{selectedEntity.rating} ({selectedEntity.review_count} reviews)</span>
              </div>
              
              <p className="text-sm mb-1">
                {selectedEntity.address ? 
                  `${selectedEntity.address?.street || ''}, ${selectedEntity.address?.city || ''}, ${selectedEntity.address?.state || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') || 'Address not available' : 
                  'Address not available'
                }
              </p>
              
              <p className="text-sm mb-2">{selectedEntity.phone}</p>
              
              {selectedEntity.badges.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedEntity.badges.map(badge => (
                    <span 
                      key={badge} 
                      className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {badge.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
              
              <button 
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                onClick={() => window.open(`/directory/${selectedEntity.id}`, '_blank')}
              >
                View Details
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

// Helper function to get marker icon based on entity type
function getMarkerIconByType(entityType: string): string {
  switch (entityType) {
    case 'hospital':
      return '/images/map-markers/hospital-marker.svg';
    case 'pharmacy':
      return '/images/map-markers/pharmacy-marker.svg';
    case 'clinic':
      return '/images/map-markers/clinic-marker.svg';
    case 'practitioner':
      return '/images/map-markers/doctor-marker.svg';
    case 'health_center':
    default:
      return '/images/map-markers/health-center-marker.svg';
  }
}

export default GoogleMapComponent;
