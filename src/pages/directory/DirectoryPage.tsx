// Healthcare Directory Page
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EntityService, EntityType, BadgeType, HealthcareEntity } from '../../lib/entities';
import { githubDB, collections } from '../../lib/database';
import {
  Search,
  MapPin,
  Filter,
  Star,
  Clock,
  Phone,
  Globe,
  Calendar,
  Video,
  Shield,
  Award,
  Users,
  Map,
  List,
  Grid,
  Loader2
} from 'lucide-react';
import DirectoryMapView from '../../components/DirectoryMapView';
import DirectoryGridView from '../../components/DirectoryGridView';

const DirectoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entities, setEntities] = useState<HealthcareEntity[]>([]);
  const [displayedEntities, setDisplayedEntities] = useState<HealthcareEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'grid'>('list');
  const [sortBy, setSortBy] = useState('relevance');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [filters, setFilters] = useState({
    query: searchParams.get('search') || '',
    entity_type: searchParams.get('type') || '',
    specialties: [],
    location: '',
    rating_min: 0,
    features: [],
    badges: [],
    insurance: '',
    language: ''
  });

  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);

  const entityTypeOptions = [
    { value: '', label: 'All Types' },
    { value: EntityType.HEALTH_CENTER, label: 'Health Centers' },
    { value: EntityType.CLINIC, label: 'Clinics' },
    { value: EntityType.HOSPITAL, label: 'Hospitals' },
    { value: EntityType.PHARMACY, label: 'Pharmacies' },
    { value: EntityType.PRACTITIONER, label: 'Individual Practitioners' }
  ];

  const featureOptions = [
    { value: 'online_booking', label: 'Online Booking' },
    { value: 'telehealth', label: 'Telehealth' },
    { value: 'emergency_services', label: 'Emergency Services' },
    { value: '24_7', label: '24/7 Available' }
  ];

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting user location:", error);
        // Default to a fallback location if permission is denied
        setUserLocation({ lat: 34.0522, lng: -118.2437 });
      }
    );
  }, []);

  useEffect(() => {
    const loadPageData = async () => {
      setIsLoading(true);
      try {
        const [results, specialties] = await Promise.all([
          EntityService.searchEntities(filters),
          githubDB.get('specialties')
        ]);
        setEntities(results);
        setSpecialtyOptions(specialties);
      } catch (error) {
        console.error('Failed to load page data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPageData();
  }, []);

  useEffect(() => {
    let sortedEntities = [...entities];
    if (sortBy === 'rating') {
      sortedEntities.sort((a, b) => b.rating - a.rating);
    }
    // Add other sort options here
    setDisplayedEntities(sortedEntities);
  }, [entities, sortBy]);

  const searchEntities = async () => {
    setIsLoading(true);
    try {
      const results = await EntityService.searchEntities(filters);
      setEntities(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    searchEntities();
    // Update URL params
    const params = new URLSearchParams();
    if (filters.query) params.set('search', filters.query);
    if (filters.entity_type) params.set('type', filters.entity_type);
    setSearchParams(params);
  };

  const getBadgeIcon = (badge: BadgeType) => {
    switch (badge) {
      case BadgeType.VERIFIED:
        return <Shield className="w-4 h-4" />;
      case BadgeType.TOP_RATED:
        return <Award className="w-4 h-4" />;
      case BadgeType.RESPONSIVE:
        return <Clock className="w-4 h-4" />;
      case BadgeType.TELEHEALTH:
        return <Video className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getBadgeColor = (badge: BadgeType) => {
    switch (badge) {
      case BadgeType.VERIFIED:
        return 'bg-green-100 text-green-800';
      case BadgeType.TOP_RATED:
        return 'bg-yellow-100 text-yellow-800';
      case BadgeType.RESPONSIVE:
        return 'bg-blue-100 text-blue-800';
      case BadgeType.TELEHEALTH:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark">Healthcare Directory</h1>
              <p className="mt-1 text-gray-600">
                Find verified healthcare providers in your area
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="w-4 h-4 mr-1" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Map className="w-4 h-4 mr-1" />
                  Map
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-dark mb-4">Filter Results</h3>
              
              {/* Search Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.query}
                    onChange={(e) => handleFilterChange('query', e.target.value)}
                    placeholder="Provider, condition, or service"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Provider Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Type
                </label>
                <select
                  value={filters.entity_type}
                  onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {entityTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    placeholder="City, state, or zip code"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => handleFilterChange('rating_min', rating)}
                      className={`flex items-center px-2 py-1 rounded text-sm ${
                        filters.rating_min >= rating
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      {rating}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features
                </label>
                <div className="space-y-2">
                  {featureOptions.map(option => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.features.includes(option.value)}
                        onChange={(e) => {
                          const features = e.target.checked
                            ? [...filters.features, option.value]
                            : filters.features.filter(f => f !== option.value);
                          handleFilterChange('features', features);
                        }}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSearch}
                className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Searching healthcare providers...</p>
              </div>
            ) : (
              <>
                {/* Results Header */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600">
                      {displayedEntities.length} healthcare providers found
                    </p>
                    <select
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="relevance">Sort by Relevance</option>
                      <option value="rating">Sort by Rating</option>
                      <option value="distance">Sort by Distance</option>
                      <option value="availability">Sort by Availability</option>
                    </select>
                  </div>
                </div>

                {/* Render based on view mode */}
                {viewMode === 'list' && (
                  <div className="space-y-6">
                    {displayedEntities.map((entity) => (
                      <div key={entity.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row">
                          {/* Provider Image */}
                          <div className="md:w-24 md:h-24 w-full h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg mb-4 md:mb-0 md:mr-6 flex items-center justify-center">
                            {entity.logo_url ? (
                              <img
                                src={entity.logo_url}
                                alt={entity.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Users className="w-8 h-8 text-primary" />
                            )}
                          </div>

                          {/* Provider Info */}
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-xl font-semibold text-dark">
                                    <Link to={`/directory/${entity.id}`} className="hover:text-primary transition-colors">
                                      {entity.name}
                                    </Link>
                                  </h3>
                                  {entity.badges?.map((badge: BadgeType) => (
                                    <span
                                      key={badge}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        getBadgeColor(badge)
                                      }`}
                                    >
                                      {getBadgeIcon(badge)}
                                      <span className="ml-1 capitalize">
                                        {badge.replace('_', ' ')}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                                
                                <p className="text-gray-600 mb-2">{entity.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {entity.address?.city && entity.address?.state ? 
                                      `${entity.address.city}, ${entity.address.state}` : 
                                      'Location not available'
                                    }
                                  </div>
                                  <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-1" />
                                    {entity.phone}
                                  </div>
                                  {entity.website && (
                                    <div className="flex items-center">
                                      <Globe className="w-4 h-4 mr-1" />
                                      <a
                                        href={entity.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80"
                                      >
                                        Website
                                      </a>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-4 mb-3">
                                  <div className="flex items-center">
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-4 h-4 ${
                                            star <= entity.rating
                                              ? 'text-yellow-400 fill-current'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="ml-2 text-sm text-gray-600">
                                      {entity.rating} ({entity.review_count} reviews)
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  {entity.specialties?.slice(0, 3).map((specialty: string) => (
                                    <span
                                      key={specialty}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                                  {entity.specialties?.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                      +{entity.specialties.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="mt-4 md:mt-0 md:ml-6 flex flex-col space-y-2">
                                <Link
                                  to={`/book/${entity.id}`}
                                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-center flex items-center justify-center"
                                >
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Book Now
                                </Link>
                                {entity.features?.telehealth && (
                                  <button className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors flex items-center justify-center">
                                    <Video className="w-4 h-4 mr-2" />
                                    Telehealth
                                  </button>
                                )}
                                <Link
                                  to={`/directory/${entity.id}`}
                                  className="text-primary border border-primary px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors text-center"
                                >
                                  View Profile
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {viewMode === 'grid' && (
                  <DirectoryGridView
                    entities={displayedEntities}
                    loading={isLoading}
                    onEntitySelect={(entity) => {
                      // Navigate to entity detail page
                      window.location.href = `/directory/${entity.id}`;
                    }}
                  />
                )}
                
                {viewMode === 'map' && userLocation && (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <DirectoryMapView
                      initialEntities={displayedEntities}
                      filters={{
                        entityType: filters.entity_type as any,
                        specialties: filters.specialties as string[],
                        searchQuery: filters.query
                      }}
                      centerLat={userLocation.lat}
                      centerLng={userLocation.lng}
                      zoom={12}
                      onEntitySelect={(entity) => {
                        // Navigate to entity detail page
                        window.location.href = `/directory/${entity.id}`;
                      }}
                    />
                  </div>
                )}

                {displayedEntities.length === 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No providers found
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Try adjusting your search criteria or location
                    </p>
                    <button
                      onClick={() => {
                        setFilters({
                          query: '',
                          entity_type: '',
                          specialties: [],
                          location: '',
                          rating_min: 0,
                          features: [],
                          badges: [],
                          insurance: '',
                          language: ''
                        });
                        searchEntities();
                      }}
                      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectoryPage;
