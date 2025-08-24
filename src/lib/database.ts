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
  coaching_programs: 'coaching_programs',
  coaching_sessions: 'coaching_sessions',
  coaching_clients: 'coaching_clients',
  entity_integrations: 'entity_integrations',
  entity_analytics: 'entity_analytics',
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
  course_lessons: 'course_lessons',
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
  system_settings: 'system_settings',
  
  // Additional collections for production completeness
  booking_reminders: 'booking_reminders',
  newsletter_subscriptions: 'newsletter_subscriptions',
  news_sources: 'news_sources',
  news_articles: 'news_articles',
  verification_queue: 'verification_queue',
  moderation_queue: 'moderation_queue',
  comments: 'comments',
  user_preferences: 'user_preferences',
  encrypted_keys: 'encrypted_keys',
  activity_feed: 'activity_feed',
  
  // New content collections
  weekly_tips: 'weekly_tips',
  timeless_facts: 'timeless_facts',
  forum_questions: 'forum_questions',
  forum_answers: 'forum_answers',
  forum_categories: 'forum_categories',
  
  // Job management collections
  job_postings: 'job_postings',
  job_applications: 'job_applications',
  job_categories: 'job_categories',
  job_saved: 'job_saved',
  job_alerts: 'job_alerts',
  
  // Hospital Management System collections
  patients: 'patients',
  patient_identifiers: 'patient_identifiers',
  patient_entity_links: 'patient_entity_links',
  encounters: 'encounters',
  vitals: 'vitals',
  conditions: 'conditions',
  allergies: 'allergies',
  medication_requests: 'medication_requests',
  medication_dispenses: 'medication_dispenses',
  lab_orders: 'lab_orders',
  lab_results: 'lab_results',
  imaging_orders: 'imaging_orders',
  documents: 'documents',
  care_plans: 'care_plans',
  referrals: 'referrals',
  bed_management: 'bed_management',
  staff_schedules: 'staff_schedules',
  triage_notes: 'triage_notes',
  pharmacy_inventory: 'pharmacy_inventory',
  pharmacy_orders: 'pharmacy_orders',
  insurance_claims: 'insurance_claims',
  billing_items: 'billing_items',
  consents: 'consents',
  access_grants: 'access_grants',
  
  // AI Chatbot
  ai_chatbot_support: 'ai_chatbot_support',
  
  // AILab Collections
  ai_care_paths: 'ai_care_paths',
  ai_lab_explanations: 'ai_lab_explanations',
  ai_procedure_navigators: 'ai_procedure_navigators',
  ai_emergency_plans: 'ai_emergency_plans',
  ai_medical_timelines: 'ai_medical_timelines',
  ai_cultural_guidance: 'ai_cultural_guidance',
  ai_photo_analyses: 'ai_photo_analyses',
  ai_care_coordination: 'ai_care_coordination',
  ai_health_goals: 'ai_health_goals',
  ai_family_genetics: 'ai_family_genetics',
  
  // TODO5 Required Collections
  verification_requests: 'verification_requests',
  verification_documents: 'verification_documents',
  services: 'services',
  slot_locks: 'slot_locks',
  scheduled_emails: 'scheduled_emails',
  carts: 'carts',
  forum_posts: 'forum_posts',
  forum_replies: 'forum_replies',
  podcast_series: 'podcast_series',
  podcast_episodes: 'podcast_episodes',
  podcast_rss_feeds: 'podcast_rss_feeds',
  disbursements: 'disbursements',
  tool_incidents: 'tool_incidents',
  tool_versions: 'tool_versions',
  unsubscribe_records: 'unsubscribe_records',
  session_tokens: 'session_tokens',
  consent_records: 'consent_records',
  data_export_requests: 'data_export_requests',
  data_deletion_requests: 'data_deletion_requests',
  search_analytics: 'search_analytics',
  uptime_checks: 'uptime_checks',
  error_logs: 'error_logs'
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
export const dbHelpers = githubDB; // Alias for backward compatibility