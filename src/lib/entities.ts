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
      
      // If no entities found in database, use sample data for development
      if (!entities || entities.length === 0) {
        entities = SAMPLE_ENTITIES.filter(entity => 
          entity.is_active && entity.verification_status === VerificationStatus.VERIFIED
        );
      }
    } catch (error) {
      console.warn('Database unavailable, using sample data:', error);
      // Fallback to sample data if database is unavailable
      entities = SAMPLE_ENTITIES.filter(entity => 
        entity.is_active && entity.verification_status === VerificationStatus.VERIFIED
      );
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

// Geographic data for healthcare specialties
export const HEALTHCARE_SPECIALTIES = [
  // Medical Specialties
  'Family Medicine', 'Internal Medicine', 'Pediatrics', 'Geriatrics',
  'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
  'Hematology', 'Infectious Disease', 'Nephrology', 'Neurology',
  'Oncology', 'Pulmonology', 'Rheumatology', 'Urology',
  
  // Surgical Specialties
  'General Surgery', 'Cardiac Surgery', 'Neurosurgery', 'Orthopedic Surgery',
  'Plastic Surgery', 'Trauma Surgery', 'Vascular Surgery',
  
  // Other Specialties
  'Anesthesiology', 'Emergency Medicine', 'Pathology', 'Radiology',
  'Psychiatry', 'Physical Medicine', 'Preventive Medicine',
  
  // Allied Health
  'Nursing', 'Physical Therapy', 'Occupational Therapy', 'Speech Therapy',
  'Mental Health Counseling', 'Nutrition', 'Pharmacy',
  
  // Alternative Medicine
  'Acupuncture', 'Chiropractic', 'Naturopathy', 'Homeopathy'
];

export const INSURANCE_PROVIDERS = [
  'Aetna', 'Anthem', 'Blue Cross Blue Shield', 'Cigna', 'Humana',
  'Kaiser Permanente', 'Medicaid', 'Medicare', 'Tricare', 'UnitedHealth',
  'Self-Pay', 'Workers Compensation'
];

export const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Japanese', 'Korean',
  'Arabic', 'Hindi', 'Russian', 'Vietnamese', 'Tagalog'
];

// Sample Healthcare Entities for Development/Testing
export const SAMPLE_ENTITIES: HealthcareEntity[] = [
  {
    id: 'entity_1',
    name: 'City General Hospital',
    entity_type: EntityType.HOSPITAL,
    owner_user_id: 'user_1',
    description: 'Leading multi-specialty hospital providing comprehensive healthcare services with state-of-the-art facilities and experienced medical professionals.',
    specialties: ['Emergency Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'],
    services: ['Emergency Care', 'Surgery', 'Imaging', 'Laboratory'],
    languages: ['English', 'Spanish'],
    email: 'info@citygeneral.com',
    phone: '(555) 123-4567',
    website: 'https://citygeneral.com',
    address: {
      street: '123 Medical Center Drive',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      postal_code: '90210',
      coordinates: {
        lat: 34.0736,
        lng: -118.4004
      }
    },
    hours: {
      monday: { open: '24/7', close: '24/7', is_closed: false },
      tuesday: { open: '24/7', close: '24/7', is_closed: false },
      wednesday: { open: '24/7', close: '24/7', is_closed: false },
      thursday: { open: '24/7', close: '24/7', is_closed: false },
      friday: { open: '24/7', close: '24/7', is_closed: false },
      saturday: { open: '24/7', close: '24/7', is_closed: false },
      sunday: { open: '24/7', close: '24/7', is_closed: false }
    },
    verification_status: VerificationStatus.VERIFIED,
    verification_documents: {},
    color_theme: {
      primary: '#dc2626',
      secondary: '#fca5a5'
    },
    badges: [BadgeType.VERIFIED, BadgeType.TWENTY_FOUR_SEVEN],
    rating: 4.2,
    review_count: 245,
    features: {
      online_booking: true,
      telehealth: false,
      emergency_services: true,
      insurance_accepted: ['Blue Cross', 'Aetna', 'Medicare'],
      payment_methods: ['Insurance', 'Cash', 'Credit Card']
    },
    is_active: true,
    is_featured: true,
    subscription_tier: 'premium',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-08-15T00:00:00Z'
  },
  {
    id: 'entity_2',
    name: 'Sunset Family Clinic',
    entity_type: EntityType.CLINIC,
    owner_user_id: 'user_2',
    description: 'Comprehensive family healthcare clinic offering personalized medical care for patients of all ages in a comfortable, welcoming environment.',
    specialties: ['Family Medicine', 'Pediatrics', 'Preventive Care'],
    services: ['Primary Care', 'Vaccinations', 'Health Screenings', 'Telehealth'],
    languages: ['English', 'Spanish', 'French'],
    email: 'contact@sunsetfamily.com',
    phone: '(555) 234-5678',
    website: 'https://sunsetfamily.com',
    address: {
      street: '456 Sunset Boulevard',
      city: 'Beverly Hills',
      state: 'CA',
      country: 'USA',
      postal_code: '90210',
      coordinates: {
        lat: 34.0736,
        lng: -118.4004
      }
    },
    hours: {
      monday: { open: '8:00', close: '17:00', is_closed: false },
      tuesday: { open: '8:00', close: '17:00', is_closed: false },
      wednesday: { open: '8:00', close: '17:00', is_closed: false },
      thursday: { open: '8:00', close: '17:00', is_closed: false },
      friday: { open: '8:00', close: '17:00', is_closed: false },
      saturday: { open: '9:00', close: '13:00', is_closed: false },
      sunday: { open: '', close: '', is_closed: true }
    },
    verification_status: VerificationStatus.VERIFIED,
    verification_documents: {},
    color_theme: {
      primary: '#2563eb',
      secondary: '#93c5fd'
    },
    badges: [BadgeType.VERIFIED, BadgeType.TOP_RATED, BadgeType.TELEHEALTH],
    rating: 4.7,
    review_count: 128,
    features: {
      online_booking: true,
      telehealth: true,
      emergency_services: false,
      insurance_accepted: ['Blue Cross', 'Cigna', 'UnitedHealth'],
      payment_methods: ['Insurance', 'Cash', 'Credit Card']
    },
    is_active: true,
    is_featured: false,
    subscription_tier: 'basic',
    created_at: '2024-02-10T00:00:00Z',
    updated_at: '2024-08-10T00:00:00Z'
  },
  {
    id: 'entity_3',
    name: 'Dr. Sarah Johnson, MD',
    entity_type: EntityType.PRACTITIONER,
    owner_user_id: 'user_3',
    description: 'Board-certified cardiologist with over 15 years of experience in cardiovascular medicine, specializing in preventive cardiology and heart disease management.',
    specialties: ['Cardiology', 'Preventive Medicine'],
    services: ['Cardiac Consultation', 'ECG', 'Stress Testing', 'Heart Disease Prevention'],
    languages: ['English'],
    email: 'dr.johnson@heartcare.com',
    phone: '(555) 345-6789',
    website: 'https://drjohnsoncard.com',
    address: {
      street: '789 Heart Health Center',
      city: 'Santa Monica',
      state: 'CA',
      country: 'USA',
      postal_code: '90401',
      coordinates: {
        lat: 34.0195,
        lng: -118.4912
      }
    },
    hours: {
      monday: { open: '9:00', close: '17:00', is_closed: false },
      tuesday: { open: '9:00', close: '17:00', is_closed: false },
      wednesday: { open: '9:00', close: '17:00', is_closed: false },
      thursday: { open: '9:00', close: '17:00', is_closed: false },
      friday: { open: '9:00', close: '15:00', is_closed: false },
      saturday: { open: '', close: '', is_closed: true },
      sunday: { open: '', close: '', is_closed: true }
    },
    verification_status: VerificationStatus.VERIFIED,
    verification_documents: {},
    color_theme: {
      primary: '#7c3aed',
      secondary: '#c4b5fd'
    },
    badges: [BadgeType.VERIFIED, BadgeType.TOP_RATED, BadgeType.RESPONSIVE],
    rating: 4.9,
    review_count: 86,
    features: {
      online_booking: true,
      telehealth: true,
      emergency_services: false,
      insurance_accepted: ['Blue Cross', 'Aetna', 'Medicare', 'Cigna'],
      payment_methods: ['Insurance', 'Cash', 'Credit Card']
    },
    is_active: true,
    is_featured: true,
    subscription_tier: 'premium',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-08-20T00:00:00Z'
  },
  {
    id: 'entity_4',
    name: 'MedMart Pharmacy',
    entity_type: EntityType.PHARMACY,
    owner_user_id: 'user_4',
    description: 'Full-service pharmacy providing prescription medications, over-the-counter drugs, health products, and pharmaceutical consultation services.',
    specialties: ['Pharmacy', 'Medication Management'],
    services: ['Prescription Filling', 'Medication Consultation', 'Health Products', 'Vaccinations'],
    languages: ['English', 'Spanish'],
    email: 'info@medmartpharmacy.com',
    phone: '(555) 456-7890',
    website: 'https://medmart.com',
    address: {
      street: '321 Pharmacy Street',
      city: 'West Hollywood',
      state: 'CA',
      country: 'USA',
      postal_code: '90069',
      coordinates: {
        lat: 34.0900,
        lng: -118.3617
      }
    },
    hours: {
      monday: { open: '8:00', close: '22:00', is_closed: false },
      tuesday: { open: '8:00', close: '22:00', is_closed: false },
      wednesday: { open: '8:00', close: '22:00', is_closed: false },
      thursday: { open: '8:00', close: '22:00', is_closed: false },
      friday: { open: '8:00', close: '22:00', is_closed: false },
      saturday: { open: '9:00', close: '20:00', is_closed: false },
      sunday: { open: '10:00', close: '18:00', is_closed: false }
    },
    verification_status: VerificationStatus.VERIFIED,
    verification_documents: {},
    color_theme: {
      primary: '#059669',
      secondary: '#6ee7b7'
    },
    badges: [BadgeType.VERIFIED, BadgeType.RESPONSIVE],
    rating: 4.3,
    review_count: 167,
    features: {
      online_booking: false,
      telehealth: false,
      emergency_services: false,
      insurance_accepted: ['All Major Insurance', 'Medicare', 'Medicaid'],
      payment_methods: ['Insurance', 'Cash', 'Credit Card', 'HSA/FSA']
    },
    is_active: true,
    is_featured: false,
    subscription_tier: 'basic',
    created_at: '2024-03-05T00:00:00Z',
    updated_at: '2024-08-05T00:00:00Z'
  },
  {
    id: 'entity_5',
    name: 'Community Health Center',
    entity_type: EntityType.HEALTH_CENTER,
    owner_user_id: 'user_5',
    description: 'Comprehensive community health center providing affordable healthcare services to underserved populations with sliding scale fees and multilingual staff.',
    specialties: ['Family Medicine', 'Mental Health', 'Dental Care', 'Nutrition'],
    services: ['Primary Care', 'Mental Health Services', 'Dental Care', 'Health Education'],
    languages: ['English', 'Spanish', 'Korean', 'Arabic'],
    email: 'contact@communityhealthla.org',
    phone: '(555) 567-8901',
    website: 'https://communityhealthla.org',
    address: {
      street: '555 Community Drive',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      postal_code: '90015',
      coordinates: {
        lat: 34.0397,
        lng: -118.2661
      }
    },
    hours: {
      monday: { open: '8:00', close: '18:00', is_closed: false },
      tuesday: { open: '8:00', close: '18:00', is_closed: false },
      wednesday: { open: '8:00', close: '18:00', is_closed: false },
      thursday: { open: '8:00', close: '18:00', is_closed: false },
      friday: { open: '8:00', close: '18:00', is_closed: false },
      saturday: { open: '9:00', close: '14:00', is_closed: false },
      sunday: { open: '', close: '', is_closed: true }
    },
    verification_status: VerificationStatus.VERIFIED,
    verification_documents: {},
    color_theme: {
      primary: '#ea580c',
      secondary: '#fed7aa'
    },
    badges: [BadgeType.VERIFIED, BadgeType.ACCESSIBLE, BadgeType.PEDIATRIC_FRIENDLY],
    rating: 4.1,
    review_count: 203,
    features: {
      online_booking: true,
      telehealth: true,
      emergency_services: false,
      insurance_accepted: ['Medicaid', 'Medicare', 'Blue Cross', 'Sliding Scale'],
      payment_methods: ['Insurance', 'Cash', 'Sliding Scale']
    },
    is_active: true,
    is_featured: false,
    subscription_tier: 'basic',
    created_at: '2024-01-30T00:00:00Z',
    updated_at: '2024-08-01T00:00:00Z'
  }
];
