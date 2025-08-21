// Updated Database Configuration using Real GitHub DB SDK
import { githubDB } from './github-db-sdk';

// Database Collections Schema
export const collections = {
  // User Management
  users: 'users',
  profiles: 'profiles',
  user_roles: 'user_roles',
  permissions: 'permissions',
  
  // Healthcare Entities
  entities: 'entities',
  entity_verification: 'entity_verification',
  entity_locations: 'entity_locations',
  entity_staff: 'entity_staff',
  entity_services: 'entity_services',
  entity_specialties: 'entity_specialties',
  specialties: 'specialties',
  insurance_providers: 'insurance_providers',
  languages: 'languages',
  
  // Booking System
  bookings: 'bookings',
  appointment_slots: 'appointment_slots',
  booking_payments: 'booking_payments',
  
  // Health Tools
  health_tools: 'health_tools',
  tool_results: 'tool_results',
  ai_consultations: 'ai_consultations',
  
  // Learning Management
  courses: 'courses',
  course_modules: 'course_modules',
  course_enrollments: 'course_enrollments',
  course_progress: 'course_progress',
  certificates: 'certificates',
  
  // E-commerce
  products: 'products',
  orders: 'orders',
  order_items: 'order_items',
  prescriptions: 'prescriptions',
  
  // Crowdfunding
  causes: 'causes',
  donations: 'donations',
  cause_updates: 'cause_updates',
  
  // Content Management
  blog_posts: 'blog_posts',
  podcasts: 'podcasts',
  pages: 'pages',
  media_files: 'media_files',
  
  // Reviews and Ratings
  reviews: 'reviews',
  ratings: 'ratings',
  
  // Messaging
  messages: 'messages',
  conversations: 'conversations',
  chat_sessions: 'chat_sessions',
  notifications: 'notifications',
  
  // Analytics
  analytics_events: 'analytics_events',
  reports: 'reports',
  
  // Payments
  payments: 'payments',
  payment_methods: 'payment_methods',
  subscriptions: 'subscriptions',
  
  // Admin
  audit_logs: 'audit_logs',
  feature_flags: 'feature_flags',
  system_settings: 'system_settings'
};

// Auto-initialize all collections
export const initializeDatabase = async () => {
  try {
    console.log('Initializing CareConnect database with GitHub DB...');
    
    // Initialize all collections
    await githubDB.initializeAllCollections();
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
};

export { githubDB };