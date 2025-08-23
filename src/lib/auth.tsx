// Authentication System for CareConnect Healthcare Platform
import { create } from 'zustand';
import { githubDB as dbHelpers, collections } from './database';
import { encrypt, decrypt } from './encryption';
import { 
  emailEventHandler, 
  EmailEvent, 
  triggerUserRegistered,
  triggerAppointmentBooked
} from './email-events';

// User Types
export enum UserType {
  HEALTH_CENTER = 'health_center',
  PHARMACY = 'pharmacy',
  PRACTITIONER = 'practitioner',
  PUBLIC_USER = 'public_user',
  SUPER_ADMIN = 'super_admin',
  COMPLIANCE_OFFICER = 'compliance_officer',
  MODERATOR = 'moderator',
  SUPPORT_AGENT = 'support_agent',
  HOSPITAL_ADMIN = 'hospital_admin',
  PHYSICIAN = 'physician',
  NURSE = 'nurse',
  PHARMACIST = 'pharmacist',
  LAB_TECH = 'lab_tech',
  IMAGING_TECH = 'imaging_tech',
  BILLING_CLERK = 'billing_clerk',
  PATIENT = 'patient',
  CAREGIVER = 'caregiver'
}

// Permission System
export enum Permission {
  // Entity Management
  CREATE_ENTITY = 'create_entity',
  UPDATE_ENTITY = 'update_entity',
  DELETE_ENTITY = 'delete_entity',
  VERIFY_ENTITY = 'verify_entity',
  
  // User Management
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  VIEW_USER_DATA = 'view_user_data',
  
  // Content Management
  CREATE_CONTENT = 'create_content',
  UPDATE_CONTENT = 'update_content',
  DELETE_CONTENT = 'delete_content',
  MODERATE_CONTENT = 'moderate_content',
  
  // Financial Operations
  VIEW_PAYMENTS = 'view_payments',
  PROCESS_REFUNDS = 'process_refunds',
  MANAGE_PAYOUTS = 'manage_payouts',
  
  // System Administration
  SYSTEM_CONFIG = 'system_config',
  VIEW_ANALYTICS = 'view_analytics',
  AUDIT_LOGS = 'audit_logs',
  
  // Hospital Management System Permissions
  MANAGE_PATIENTS = 'manage_patients',
  VIEW_PATIENT_DATA = 'view_patient_data',
  CREATE_ENCOUNTERS = 'create_encounters',
  MANAGE_ENCOUNTERS = 'manage_encounters',
  RECORD_VITALS = 'record_vitals',
  MANAGE_CONDITIONS = 'manage_conditions',
  PRESCRIBE_MEDICATIONS = 'prescribe_medications',
  DISPENSE_MEDICATIONS = 'dispense_medications',
  ORDER_LABS = 'order_labs',
  VIEW_LAB_RESULTS = 'view_lab_results',
  ORDER_IMAGING = 'order_imaging',
  VIEW_IMAGING_RESULTS = 'view_imaging_results',
  MANAGE_CARE_PLANS = 'manage_care_plans',
  CREATE_REFERRALS = 'create_referrals',
  MANAGE_REFERRALS = 'manage_referrals',
  MANAGE_BEDS = 'manage_beds',
  MANAGE_PHARMACY_INVENTORY = 'manage_pharmacy_inventory',
  PROCESS_BILLING = 'process_billing',
  MANAGE_INSURANCE_CLAIMS = 'manage_insurance_claims',
  OBTAIN_CONSENTS = 'obtain_consents',
  MANAGE_ACCESS_GRANTS = 'manage_access_grants'
}

// User Interface
export interface User {
  id: string;
  email: string;
  phone?: string;
  user_type: UserType;
  is_verified: boolean;
  is_active: boolean;
  entity_id?: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
  last_login?: string;
}

// Profile Interface
export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
  license_number?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  preferences: {
    notifications: boolean;
    marketing_emails: boolean;
    data_sharing: boolean;
  };
  created_at: string;
  updated_at: string;
}

// Authentication Store
interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  hasPermission: (permission: Permission) => boolean;
  refreshUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    try {
      // Find user by email
      const users = await dbHelpers.find(collections.users, { email });
      const user = users[0];
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify password (simplified - in production use proper hashing)
      const hashedPassword = await hashPassword(password);
      if (user.password_hash !== hashedPassword) {
        throw new Error('Invalid password');
      }
      
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }
      
      // Update last login
      await dbHelpers.update(collections.users, user.id, {
        last_login: new Date().toISOString()
      });
      
      // Get user profile
      const profiles = await dbHelpers.find(collections.profiles, { user_id: user.id });
      const profile = profiles[0];
      
      // Store session
      localStorage.setItem('careconnect_token', encrypt(user.id));
      
      set({ 
        user: { ...user, password_hash: undefined }, 
        profile,
        isAuthenticated: true,
        isLoading: false 
      });
      
      // Trigger login alert for security monitoring
      try {
        await emailEventHandler.trigger(EmailEvent.USER_LOGIN, {
          userEmail: user.email,
          userName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User',
          eventData: {
            loginTime: new Date().toLocaleString(),
            location: 'Unknown', // Could be determined via IP geolocation
            device: navigator.userAgent,
            ipAddress: 'N/A' // Would need server-side implementation
          }
        });
      } catch (emailError) {
        console.warn('Failed to send login notification:', emailError);
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      return false;
    }
  },

  register: async (userData: any) => {
    set({ isLoading: true });
    
    try {
      // Check if user already exists
      const existingUsers = await dbHelpers.find(collections.users, { email: userData.email });
      if (existingUsers.length > 0) {
        throw new Error('User already exists');
      }
      
      // Create user
      const hashedPassword = await hashPassword(userData.password);
      const newUser = await dbHelpers.create(collections.users, {
        email: userData.email,
        phone: userData.phone,
        user_type: userData.user_type,
        password_hash: hashedPassword,
        is_verified: false,
        is_active: true,
        permissions: getDefaultPermissions(userData.user_type)
      });
      
      // Create profile
      const newProfile = await dbHelpers.create(collections.profiles, {
        user_id: newUser.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        bio: userData.bio || '',
        specialties: userData.specialties || [],
        languages: userData.languages || ['English'],
        license_number: userData.license_number,
        preferences: {
          notifications: true,
          marketing_emails: false,
          data_sharing: false
        }
      });
      
      set({ 
        user: { ...newUser, password_hash: undefined },
        profile: newProfile,
        isAuthenticated: true,
        isLoading: false 
      });
      
      // Trigger welcome email
      try {
        await triggerUserRegistered(
          newUser.email,
          `${newProfile.first_name} ${newProfile.last_name}`.trim()
        );
        
        // Also trigger email verification
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await emailEventHandler.trigger(EmailEvent.EMAIL_VERIFICATION_REQUESTED, {
          userEmail: newUser.email,
          userName: `${newProfile.first_name} ${newProfile.last_name}`.trim(),
          eventData: {
            verificationCode
          }
        });
      } catch (emailError) {
        console.warn('Failed to send welcome/verification email:', emailError);
      }
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('careconnect_token');
    set({ 
      user: null, 
      profile: null, 
      isAuthenticated: false 
    });
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user, profile } = get();
    if (!user || !profile) return false;
    
    try {
      const updatedProfile = await dbHelpers.update(collections.profiles, profile.id, updates);
      set({ profile: updatedProfile });
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  },

  hasPermission: (permission: Permission) => {
    const { user } = get();
    return user?.permissions.includes(permission) || false;
  },

  refreshUser: async () => {
    const token = localStorage.getItem('careconnect_token');
    if (!token) return;
    
    try {
      const userId = decrypt(token);
      const user = await dbHelpers.findById(collections.users, userId);
      
      if (user && user.is_active) {
        const profiles = await dbHelpers.find(collections.profiles, { user_id: userId });
        const profile = profiles[0];
        
        set({ 
          user: { ...user, password_hash: undefined },
          profile,
          isAuthenticated: true 
        });
      } else {
        get().logout();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      get().logout();
    }
  }
}));

// Helper Functions
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getDefaultPermissions(userType: UserType): Permission[] {
  switch (userType) {
    case UserType.SUPER_ADMIN:
      return Object.values(Permission);
    
    case UserType.COMPLIANCE_OFFICER:
      return [
        Permission.VERIFY_ENTITY,
        Permission.VIEW_USER_DATA,
        Permission.MODERATE_CONTENT,
        Permission.VIEW_ANALYTICS,
        Permission.AUDIT_LOGS
      ];
    
    case UserType.MODERATOR:
      return [
        Permission.MODERATE_CONTENT,
        Permission.UPDATE_CONTENT,
        Permission.DELETE_CONTENT
      ];
    
    case UserType.SUPPORT_AGENT:
      return [
        Permission.VIEW_USER_DATA,
        Permission.UPDATE_USER,
        Permission.VIEW_PAYMENTS
      ];
    
    case UserType.HEALTH_CENTER:
    case UserType.PHARMACY:
    case UserType.PRACTITIONER:
      return [
        Permission.CREATE_ENTITY,
        Permission.UPDATE_ENTITY,
        Permission.CREATE_CONTENT,
        Permission.UPDATE_CONTENT,
        Permission.VIEW_PAYMENTS
      ];
    
    case UserType.HOSPITAL_ADMIN:
      return [
        Permission.MANAGE_PATIENTS,
        Permission.VIEW_PATIENT_DATA,
        Permission.CREATE_ENCOUNTERS,
        Permission.MANAGE_ENCOUNTERS,
        Permission.MANAGE_CARE_PLANS,
        Permission.MANAGE_REFERRALS,
        Permission.MANAGE_BEDS,
        Permission.PROCESS_BILLING,
        Permission.MANAGE_INSURANCE_CLAIMS,
        Permission.OBTAIN_CONSENTS,
        Permission.MANAGE_ACCESS_GRANTS,
        Permission.VIEW_ANALYTICS
      ];
    
    case UserType.PHYSICIAN:
      return [
        Permission.MANAGE_PATIENTS,
        Permission.VIEW_PATIENT_DATA,
        Permission.CREATE_ENCOUNTERS,
        Permission.MANAGE_ENCOUNTERS,
        Permission.RECORD_VITALS,
        Permission.MANAGE_CONDITIONS,
        Permission.PRESCRIBE_MEDICATIONS,
        Permission.ORDER_LABS,
        Permission.VIEW_LAB_RESULTS,
        Permission.ORDER_IMAGING,
        Permission.VIEW_IMAGING_RESULTS,
        Permission.MANAGE_CARE_PLANS,
        Permission.CREATE_REFERRALS,
        Permission.OBTAIN_CONSENTS
      ];
    
    case UserType.NURSE:
      return [
        Permission.VIEW_PATIENT_DATA,
        Permission.MANAGE_ENCOUNTERS,
        Permission.RECORD_VITALS,
        Permission.MANAGE_CONDITIONS,
        Permission.MANAGE_CARE_PLANS,
        Permission.OBTAIN_CONSENTS
      ];
    
    case UserType.PHARMACIST:
      return [
        Permission.VIEW_PATIENT_DATA,
        Permission.DISPENSE_MEDICATIONS,
        Permission.MANAGE_PHARMACY_INVENTORY
      ];
    
    case UserType.LAB_TECH:
      return [
        Permission.VIEW_PATIENT_DATA,
        Permission.VIEW_LAB_RESULTS,
        Permission.ORDER_LABS
      ];
    
    case UserType.IMAGING_TECH:
      return [
        Permission.VIEW_PATIENT_DATA,
        Permission.VIEW_IMAGING_RESULTS,
        Permission.ORDER_IMAGING
      ];
    
    case UserType.BILLING_CLERK:
      return [
        Permission.VIEW_PATIENT_DATA,
        Permission.PROCESS_BILLING,
        Permission.MANAGE_INSURANCE_CLAIMS,
        Permission.VIEW_PAYMENTS
      ];
    
    case UserType.PATIENT:
      return [
        Permission.VIEW_PATIENT_DATA,
        Permission.MANAGE_ACCESS_GRANTS
      ];
    
    case UserType.CAREGIVER:
      return [
        Permission.VIEW_PATIENT_DATA
      ];
    
    case UserType.PUBLIC_USER:
    default:
      return [];
  }
}

// RBAC Component
export function withPermission(permission: Permission) {
  return function<T extends {}>(Component: React.ComponentType<T>) {
    return function PermissionWrapped(props: T) {
      const hasPermission = useAuth(state => state.hasPermission(permission));
      
      if (!hasPermission) {
        return (
          <div className="p-4 text-center">
            <h3 className="text-lg font-semibold text-red-600">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access this resource.</p>
          </div>
        );
      }
      
      return <Component {...props} />;
    };
  };
}
