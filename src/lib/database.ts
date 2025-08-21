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
  pages: 'pages',
  media_files: 'media_files',
  
  // Reviews and Ratings
  reviews: 'reviews',
  ratings: 'ratings',
  
  // Messaging
  messages: 'messages',
  conversations: 'conversations',
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

// Auto-initialize all collections with seed data
export const initializeDatabase = async () => {
  try {
    console.log('Initializing CareConnect database with GitHub DB...');
    
    // Initialize all collections
    await githubDB.initializeAllCollections();
    
    // Seed initial data if collections are empty
    await seedInitialData();
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
};

// Seed initial data for demo and development
async function seedInitialData() {
  try {
    // Seed entities (healthcare providers)
    const existingEntities = await githubDB.get(collections.entities);
    if (existingEntities.length === 0) {
      console.log('Seeding initial healthcare entities...');
      await Promise.all(INITIAL_ENTITIES.map(entity => 
        githubDB.insert(collections.entities, entity)
      ));
    }
    
    // Seed health tools
    const existingTools = await githubDB.get(collections.health_tools);
    if (existingTools.length === 0) {
      console.log('Seeding initial health tools...');
      await Promise.all(INITIAL_HEALTH_TOOLS.map(tool => 
        githubDB.insert(collections.health_tools, tool)
      ));
    }
    
    // Seed demo users
    const existingUsers = await githubDB.get(collections.users);
    if (existingUsers.length === 0) {
      console.log('Seeding demo users...');
      await Promise.all(DEMO_USERS.map(user => 
        githubDB.insert(collections.users, user)
      ));
    }
  } catch (error) {
    console.warn('Failed to seed initial data:', error);
  }
}


// Initial seed data
const INITIAL_ENTITIES = [
  {
    name: 'CareFirst Medical Center',
    entity_type: 'health_center',
    description: 'Comprehensive healthcare services with experienced medical professionals',
    specialties: ['Family Medicine', 'Internal Medicine', 'Pediatrics'],
    services: ['Primary Care', 'Urgent Care', 'Preventive Care'],
    languages: ['English', 'Spanish'],
    email: 'info@carefirst.com',
    phone: '(555) 123-4567',
    website: 'https://carefirst.com',
    address: {
      street: '123 Healthcare Blvd',
      city: 'Healthtown',
      state: 'CA',
      country: 'USA',
      postal_code: '90210',
      coordinates: { lat: 34.0522, lng: -118.2437 }
    },
    hours: {
      monday: { open: '08:00', close: '18:00', is_closed: false },
      tuesday: { open: '08:00', close: '18:00', is_closed: false },
      wednesday: { open: '08:00', close: '18:00', is_closed: false },
      thursday: { open: '08:00', close: '18:00', is_closed: false },
      friday: { open: '08:00', close: '17:00', is_closed: false },
      saturday: { open: '09:00', close: '15:00', is_closed: false },
      sunday: { open: '10:00', close: '14:00', is_closed: false }
    },
    verification_status: 'verified',
    badges: ['verified', 'top_rated', 'telehealth'],
    rating: 4.8,
    review_count: 234,
    features: {
      online_booking: true,
      telehealth: true,
      emergency_services: false,
      insurance_accepted: ['Aetna', 'Blue Cross', 'Medicare'],
      payment_methods: ['Insurance', 'Credit Card', 'Cash']
    },
    is_featured: true,
    subscription_tier: 'premium'
  },
  {
    name: 'Downtown Pharmacy Plus',
    entity_type: 'pharmacy',
    description: 'Full-service pharmacy with medication consultation and health products',
    specialties: ['Pharmacy', 'Medication Management'],
    services: ['Prescription Filling', 'Medication Consultation', 'Health Products'],
    languages: ['English'],
    email: 'contact@downtownpharmacy.com',
    phone: '(555) 987-6543',
    address: {
      street: '456 Main Street',
      city: 'Healthtown',
      state: 'CA',
      country: 'USA',
      postal_code: '90211',
      coordinates: { lat: 34.0622, lng: -118.2537 }
    },
    verification_status: 'verified',
    badges: ['verified', 'responsive'],
    rating: 4.6,
    review_count: 89,
    subscription_tier: 'basic'
  }
];

const INITIAL_HEALTH_TOOLS = [
  {
    name: 'AI Symptom Checker',
    description: 'Get preliminary insights about your symptoms using AI analysis',
    category: 'general_triage',
    type: 'ai_powered',
    ai_config: {
      model: 'gemini-2.5-flash',
      prompt_template: 'As a healthcare AI assistant, analyze these symptoms: {{symptoms}}. Age: {{age}}, Gender: {{gender}}. Provide preliminary insights and recommend appropriate care level.',
      safety_guidelines: [
        'This is not a medical diagnosis and should not replace professional medical advice.',
        'Recommend seeking immediate medical attention for serious symptoms.',
        'Always suggest consulting with healthcare providers for proper diagnosis.'
      ]
    },
    config: {
      input_fields: [
        { name: 'symptoms', type: 'text', label: 'Describe your symptoms', required: true },
        { name: 'age', type: 'number', label: 'Age', required: true, min: 0, max: 120 },
        { name: 'gender', type: 'select', label: 'Gender', required: true, options: ['Male', 'Female', 'Other'] }
      ],
      output_format: 'text',
      medical_disclaimer: 'This AI analysis is for informational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for proper diagnosis and treatment.'
    },
    tags: ['symptoms', 'ai', 'triage'],
    difficulty_level: 'beginner',
    estimated_duration: 3,
    usage_count: 1247,
    rating: 4.6
  },
  {
    name: 'BMI Calculator',
    description: 'Calculate your Body Mass Index and get health recommendations',
    category: 'fitness',
    type: 'calculator',
    config: {
      input_fields: [
        { name: 'weight', type: 'number', label: 'Weight', required: true, min: 1 },
        { name: 'height', type: 'number', label: 'Height', required: true, min: 1 },
        { name: 'unit', type: 'select', label: 'Unit System', required: true, options: ['metric', 'imperial'] }
      ],
      output_format: 'json',
      medical_disclaimer: 'BMI is a screening tool and not diagnostic. Consult healthcare providers for comprehensive health assessment.'
    },
    tags: ['bmi', 'weight', 'health'],
    difficulty_level: 'beginner',
    estimated_duration: 1,
    usage_count: 2856,
    rating: 4.8
  }
];

const DEMO_USERS = [
  {
    email: 'patient@demo.com',
    user_type: 'public_user',
    is_verified: true,
    password_hash: 'demo_hash_123' // In production, this would be properly hashed
  },
  {
    email: 'provider@demo.com',
    user_type: 'practitioner',
    is_verified: true,
    entity_id: '3',
    permissions: ['create_entity', 'update_entity', 'create_content'],
    password_hash: 'demo_hash_456'
  },
  {
    email: 'admin@demo.com',
    user_type: 'super_admin',
    is_verified: true,
    permissions: ['system_config', 'view_analytics', 'audit_logs', 'verify_entity'],
    password_hash: 'demo_hash_789'
  }
];

export { githubDB };