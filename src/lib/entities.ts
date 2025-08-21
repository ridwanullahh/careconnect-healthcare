// Healthcare Entity Management System
import { githubDB, collections } from './database';
import { UserType } from './auth';

// Entity Types
export enum EntityType {
  HEALTH_CENTER = 'health_center',
  CLINIC = 'clinic', 
  HOSPITAL = 'hospital',
  PHARMACY = 'pharmacy',
  PRACTITIONER = 'practitioner'
}

// Verification Status
export enum VerificationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

// Badge Types
export enum BadgeType {
  VERIFIED = 'verified',
  TOP_RATED = 'top_rated',
  RESPONSIVE = 'responsive',
  TELEHEALTH = 'telehealth',
  TWENTY_FOUR_SEVEN = '24_7',
  PEDIATRIC_FRIENDLY = 'pediatric_friendly',
  ACCESSIBLE = 'accessible'
}

export const getEntity = async (entityId: string): Promise<HealthcareEntity | null> => {
  return await githubDB.findById(collections.entities, entityId);
};

// Healthcare Entity Interface
export interface HealthcareEntity {
  id: string;
  name: string;
  entity_type: EntityType;
  owner_user_id: string;
  
  // Basic Information
  description: string;
  specialties: string[];
  services: string[];
  languages: string[];
  
  // Contact Information
  email: string;
  phone: string;
  website?: string;
  
  // Location
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postal_code: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Operating Hours
  hours: {
    [key: string]: {
      open: string;
      close: string;
      is_closed: boolean;
    };
  };
  
  // Verification
  verification_status: VerificationStatus;
  verification_documents: {
    government_id?: string;
    professional_license?: string;
    facility_license?: string;
    insurance_proof?: string;
  };
  
  // Branding
  logo_url?: string;
  banner_url?: string;
  color_theme: {
    primary: string;
    secondary: string;
  };
  
  // Badges and Ratings
  badges: BadgeType[];
  rating: number;
  review_count: number;
  
  // Features
  features: {
    online_booking: boolean;
    telehealth: boolean;
    emergency_services: boolean;
    insurance_accepted: string[];
    payment_methods: string[];
  };
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  subscription_tier: 'basic' | 'premium' | 'enterprise';
  
  created_at: string;
  updated_at: string;
}

// Entity Service
export class EntityService {
  static async createEntity(entityData: Partial<HealthcareEntity>): Promise<HealthcareEntity> {
    const entity = await githubDB.insert(collections.entities, {
      ...entityData,
      verification_status: VerificationStatus.PENDING,
      rating: 0,
      review_count: 0,
      badges: [],
      is_active: false,
      is_featured: false,
      subscription_tier: 'basic'
    });
    
    // Log audit event
    await this.logAuditEvent('entity_created', entity.id, entityData.owner_user_id!);
    
    return entity;
  }

  static async createService(entityId: string, serviceData: any) {
    const service = await githubDB.insert(collections.entity_services, {
      ...serviceData,
      entityId,
    });
    return service;
  }

  static async updateService(serviceId: string, updates: any) {
    const service = await githubDB.update(collections.entity_services, serviceId, updates);
    return service;
  }

  static async deleteService(serviceId: string) {
    await githubDB.delete(collections.entity_services, serviceId);
  }
  
  static async updateEntity(entityId: string, updates: Partial<HealthcareEntity>): Promise<HealthcareEntity> {
    const entity = await githubDB.update(collections.entities, entityId, updates);
    
    await this.logAuditEvent('entity_updated', entityId, updates.owner_user_id);
    
    return entity;
  }
  
  static async searchEntities(filters: {
    query?: string;
    entity_type?: EntityType;
    specialties?: string[];
    location?: {
      lat: number;
      lng: number;
      radius: number; // in kilometers
    };
    rating_min?: number;
    features?: string[];
    badges?: BadgeType[];
    insurance?: string[];
    language?: string;
  }) {
    let entities: HealthcareEntity[];
    
    try {
      // Try to get entities from database
      entities = await githubDB.find(collections.entities, {
        is_active: true,
        verification_status: VerificationStatus.VERIFIED
      });
    } catch (error) {
      console.error('Failed to fetch entities from database:', error);
      entities = []; // Return empty array on error
    }
    
    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      entities = entities.filter(entity => 
        entity.name.toLowerCase().includes(query) ||
        entity.description.toLowerCase().includes(query) ||
        entity.specialties.some((s: string) => s.toLowerCase().includes(query))
      );
    }
    
    if (filters.entity_type) {
      entities = entities.filter(entity => entity.entity_type === filters.entity_type);
    }
    
    if (filters.specialties?.length) {
      entities = entities.filter(entity => 
        filters.specialties!.some(specialty => 
          entity.specialties.includes(specialty)
        )
      );
    }
    
    if (filters.rating_min) {
      entities = entities.filter(entity => entity.rating >= filters.rating_min!);
    }
    
    if (filters.badges?.length) {
      entities = entities.filter(entity => 
        filters.badges!.some(badge => entity.badges.includes(badge))
      );
    }
    
    if (filters.language) {
      entities = entities.filter(entity => 
        entity.languages.includes(filters.language!)
      );
    }
    
    if (filters.features?.length) {
      entities = entities.filter(entity =>
        filters.features!.every(feature => (entity.features as any)[feature])
      );
    }

    if (filters.insurance) {
      entities = entities.filter(entity =>
        entity.features.insurance_accepted.includes(filters.insurance!)
      );
    }

    if (filters.location) {
      entities = entities.filter(entity => {
        if (!entity.address.coordinates) return false;
        
        const distance = this.calculateDistance(
          filters.location!.lat,
          filters.location!.lng,
          entity.address.coordinates.lat,
          entity.address.coordinates.lng
        );
        
        return distance <= filters.location!.radius;
      });
    }
    
    return entities;
  }
  
  static async submitForVerification(entityId: string, documents: any) {
    const entity = await githubDB.update(collections.entities, entityId, {
      verification_status: VerificationStatus.UNDER_REVIEW,
      verification_documents: documents
    });
    
    // Create verification record
    await githubDB.insert(collections.entity_verification, {
      entity_id: entityId,
      status: VerificationStatus.UNDER_REVIEW,
      documents_submitted: documents,
      submitted_at: new Date().toISOString()
    });
    
    await this.logAuditEvent('verification_submitted', entityId);
    
    return entity;
  }
  
  static async approveVerification(entityId: string, reviewerId: string, notes?: string) {
    const entity = await githubDB.update(collections.entities, entityId, {
      verification_status: VerificationStatus.VERIFIED,
      is_active: true
    });
    
    // Update verification record
    const verifications = await githubDB.find(collections.entity_verification, { entity_id: entityId });
    if (verifications.length > 0) {
      await githubDB.update(collections.entity_verification, verifications[0].id, {
        status: VerificationStatus.VERIFIED,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes
      });
    }
    
    // Add verified badge
    const updatedBadges = [...(entity.badges || []), BadgeType.VERIFIED];
    await githubDB.update(collections.entities, entityId, {
      badges: updatedBadges
    });
    
    await this.logAuditEvent('verification_approved', entityId, reviewerId);
    
    return entity;
  }
  
  static async rejectVerification(entityId: string, reviewerId: string, reason: string) {
    const entity = await githubDB.update(collections.entities, entityId, {
      verification_status: VerificationStatus.REJECTED
    });
    
    const verifications = await githubDB.find(collections.entity_verification, { entity_id: entityId });
    if (verifications.length > 0) {
      await githubDB.update(collections.entity_verification, verifications[0].id, {
        status: VerificationStatus.REJECTED,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason
      });
    }
    
    await this.logAuditEvent('verification_rejected', entityId, reviewerId);
    
    return entity;
  }
  
  static async addBadge(entityId: string, badge: BadgeType) {
    const entity = await githubDB.findById(collections.entities, entityId);
    if (!entity) throw new Error('Entity not found');
    
    const badges = [...(entity.badges || [])];
    if (!badges.includes(badge)) {
      badges.push(badge);
      await githubDB.update(collections.entities, entityId, { badges });
    }
    
    return entity;
  }
  
  static async updateRating(entityId: string) {
    // Get all reviews for this entity
    const reviews = await githubDB.find(collections.reviews, {
      entity_id: entityId,
      is_approved: true
    });
    
    if (reviews.length === 0) return;
    
    const totalRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    await githubDB.update(collections.entities, entityId, {
      rating: Math.round(averageRating * 10) / 10,
      review_count: reviews.length
    });
    
    // Add top rated badge if rating >= 4.5 and review count >= 10
    if (averageRating >= 4.5 && reviews.length >= 10) {
      await this.addBadge(entityId, BadgeType.TOP_RATED);
    }
  }
  
  // Utility Functions
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in kilometers
    return d;
  }
  
  static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
  
  static async logAuditEvent(action: string, entityId: string, userId?: string) {
    await githubDB.insert(collections.audit_logs, {
      action,
      entity_id: entityId,
      user_id: userId,
      timestamp: new Date().toISOString(),
      ip_address: 'unknown', // In production, capture real IP
      user_agent: navigator.userAgent
    });
  }
}
