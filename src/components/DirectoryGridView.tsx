import { HealthcareEntity, BadgeType, EntityType } from '../lib/entities';
import { Building, User, MapPin, Star, Phone, Globe, Calendar } from 'lucide-react';

interface DirectoryGridViewProps {
  entities: HealthcareEntity[];
  onEntitySelect?: (entity: HealthcareEntity) => void;
  loading?: boolean;
  error?: string | null;
}

const DirectoryGridView = ({ 
  entities, 
  onEntitySelect,
  loading = false,
  error = null 
}: DirectoryGridViewProps) => {
  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-40 bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-10 bg-gray-200 rounded w-1/3 mt-4"></div>
              </div>
            </div>
          ))}
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
    <div className="w-full py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entities.map(entity => (
          <EntityCard 
            key={entity.id} 
            entity={entity} 
            onClick={() => onEntitySelect && onEntitySelect(entity)} 
          />
        ))}
      </div>
    </div>
  );
};

interface EntityCardProps {
  entity: HealthcareEntity;
  onClick?: () => void;
}

const EntityCard = ({ entity, onClick }: EntityCardProps) => {
  // Generate a default background color based on entity type
  const getDefaultBackground = (entityType: string) => {
    const backgrounds = {
      'hospital': 'from-red-100 to-red-200',
      'clinic': 'from-blue-100 to-blue-200',
      'pharmacy': 'from-green-100 to-green-200',
      'practitioner': 'from-purple-100 to-purple-200',
      'health_center': 'from-orange-100 to-orange-200'
    };
    return backgrounds[entityType as keyof typeof backgrounds] || 'from-gray-100 to-gray-200';
  };
  
  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'practitioner':
        return <User className="w-16 h-16 text-gray-500" />;
      default:
        return <Building className="w-16 h-16 text-gray-500" />;
    }
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
      onClick={onClick}
    >
      {/* Banner/Header Image */}
      <div className={`h-40 bg-gradient-to-br ${getDefaultBackground(entity.entity_type)} flex items-center justify-center relative`}>
        {entity.banner_url ? (
          <img 
            src={entity.banner_url} 
            alt={`${entity.name} banner`} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          getEntityIcon(entity.entity_type)
        )}
        
        {/* Logo overlay */}
        {entity.logo_url && (
          <div className="absolute top-2 right-2 w-12 h-12 bg-white rounded-full p-1 shadow-lg">
            <img 
              src={entity.logo_url} 
              alt={`${entity.name} logo`} 
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-1" title={entity.name}>
            {entity.name}
          </h3>
        </div>
        
        <p className="text-sm text-gray-500 capitalize mb-2">
          {entity.entity_type.replace('_', ' ')}
        </p>
        
        <div className="flex items-center mb-3">
          <Star className="w-4 h-4 text-yellow-500 mr-1" />
          <span className="font-medium">{entity.rating || 'N/A'}</span>
          <span className="text-gray-500 text-sm ml-1">
            ({entity.review_count || 0} reviews)
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {entity.description || 'No description available.'}
        </p>
        
        <div className="mb-3 space-y-1">
          {entity.address && (
            <div className="flex items-start text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
              <div className="line-clamp-2">
                {entity.address.street && <div>{entity.address.street}</div>}
                <div>
                  {[entity.address.city, entity.address.state].filter(Boolean).join(', ')}
                  {entity.address.postal_code && ` ${entity.address.postal_code}`}
                </div>
              </div>
            </div>
          )}
          
          {entity.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-1" />
              <span>{entity.phone}</span>
            </div>
          )}
          
          {entity.website && (
            <div className="flex items-center text-sm text-gray-600">
              <Globe className="w-4 h-4 mr-1" />
              <a 
                href={entity.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Visit Website
              </a>
            </div>
          )}
        </div>
        
        {entity.badges && entity.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {entity.badges.slice(0, 3).map(badge => (
              <BadgeTag key={badge} type={badge as BadgeType} />
            ))}
            {entity.badges.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{entity.badges.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Specialties */}
        {entity.specialties && entity.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {entity.specialties.slice(0, 2).map(specialty => (
              <span
                key={specialty}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {specialty}
              </span>
            ))}
            {entity.specialties.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{entity.specialties.length - 2} more
              </span>
            )}
          </div>
        )}
        
        <div className="flex space-x-2">
          <button 
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/directory/${entity.id}`;
            }}
          >
            View Details
          </button>
          
          <button 
            className="px-3 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded hover:bg-blue-50 transition-colors flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/book/${entity.id}`;
            }}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface BadgeTagProps {
  type: BadgeType;
}

const BadgeTag = ({ type }: BadgeTagProps) => {
  const badgeConfig = {
    [BadgeType.VERIFIED]: { bg: 'bg-green-100', text: 'text-green-800', label: 'Verified' },
    [BadgeType.TOP_RATED]: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Top Rated' },
    [BadgeType.RESPONSIVE]: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Responsive' },
    [BadgeType.TELEHEALTH]: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Telehealth' },
    [BadgeType.TWENTY_FOUR_SEVEN]: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '24/7' },
    [BadgeType.PEDIATRIC_FRIENDLY]: { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Kid Friendly' },
    [BadgeType.ACCESSIBLE]: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Accessible' }
  };

  const config = badgeConfig[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type.replace('_', ' ') };

  return (
    <span className={`px-2 py-0.5 ${config.bg} ${config.text} text-xs rounded-full`}>
      {config.label}
    </span>
  );
};

export default DirectoryGridView;
