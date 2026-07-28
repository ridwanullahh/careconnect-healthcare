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
import { apiClient } from './api-client';

// --- Consent versioning config ---
// The current platform consent version. Can be overridden at runtime via the
// `current_consent_version` key in the `system_settings` collection. Fallback
// to the VITE_CURRENT_CONSENT_VERSION env var, then to '1.0.0'.
const ENV_CONSENT_VERSION =
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.VITE_CURRENT_CONSENT_VERSION) ||
  '1.0.0';

// When the SPA routes through the backend (VITE_DB_MODE = api|sqlite|lightbase),
// authentication is handled server-side via PBKDF2-hashed passwords and signed
// session tokens. In 'github' mode, auth stays client-side (SHA-256) for the
// legacy GitHub JSON storage.
const DB_MODE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DB_MODE) || 'github';
const USE_BACKEND_AUTH = DB_MODE === 'api' || DB_MODE === 'sqlite' || DB_MODE === 'lightbase';

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
  // Consent versioning state
  requiresConsent: boolean;
  currentConsentVersion: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  hasPermission: (permission: Permission) => boolean;
  refreshUser: () => Promise<void>;
  // Consent versioning actions
  fetchCurrentConsentVersion: () => Promise<void>;
  checkConsent: (userId?: string) => Promise<void>;
  acceptConsent: (version: string) => Promise<boolean>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false, // Start with false, will be set to true during operations
  isAuthenticated: false,
  requiresConsent: false,
  currentConsentVersion: null,

  login: async (email: string, password: string, rememberMe: boolean = false) => {
    set({ isLoading: true });

    try {
      let user: any;
      let profile: any;

      if (USE_BACKEND_AUTH) {
        // Backend auth: PBKDF2 password verification + signed session token.
        const res = await apiClient.login(email, password);
        user = res.user;
        profile = res.profile;
        // apiClient stores the backend token as careconnect_api_token.
        // Also keep an encrypted marker in careconnect_token for compatibility
        // with any code that checks for a session presence.
        const sessionData = {
          userId: user.id,
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          rememberMe,
        };
        try {
          localStorage.setItem('careconnect_token', encrypt(JSON.stringify(sessionData)));
        } catch {}
      } else {
        // Legacy client-side auth (github mode): SHA-256 comparison.
        const users = await dbHelpers.find(collections.users, { email });
        user = users[0];
        if (!user) throw new Error('User not found');
        const hashedPassword = await hashPassword(password);
        if (user.password_hash !== hashedPassword) throw new Error('Invalid password');
        if (!user.is_active) throw new Error('Account is deactivated');
        await dbHelpers.update(collections.users, user.id, {
          last_login: new Date().toISOString(),
        });
        const profiles = await dbHelpers.find(collections.profiles, { user_id: user.id });
        profile = profiles[0];
        const sessionData = {
          userId: user.id,
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          rememberMe,
        };
        localStorage.setItem('careconnect_token', encrypt(JSON.stringify(sessionData)));
        sessionStorage.removeItem('careconnect_token');
      }

      const cleanUser = { ...user };
      delete cleanUser.password_hash;

      set({
        user: cleanUser,
        profile,
        isAuthenticated: true,
        isLoading: false,
      });

      // Trigger login alert for security monitoring
      try {
        await emailEventHandler.trigger(EmailEvent.USER_LOGIN, {
          userEmail: user.email,
          userName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User',
          eventData: {
            loginTime: new Date().toLocaleString(),
            location: 'Unknown',
            device: navigator.userAgent,
            ipAddress: 'N/A',
          },
        });
      } catch (emailError) {
        console.warn('Failed to send login notification:', emailError);
      }

      // Consent versioning: check whether the user has accepted the current
      // platform consent version. Sets `requiresConsent` accordingly. Runs
      // after `set()` so the user is already authenticated; the modal is
      // rendered by App.tsx as a gate on top of the main app. Errors here
      // must NOT block login — fall back to requiring consent.
      try {
        await get().checkConsent(cleanUser.id);
      } catch (consentErr) {
        console.warn('Login: consent check failed, defaulting to required:', consentErr);
        set({ requiresConsent: true });
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
      let newUser: any;
      let newProfile: any;

      if (USE_BACKEND_AUTH) {
        // Backend handles entity/user/profile creation + PBKDF2 hashing.
        const res = await apiClient.register(userData);
        newUser = res.user;
        newProfile = res.profile;
        // Auto-login after registration (backend returns a signed token).
        const sessionData = {
          userId: newUser.id,
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          rememberMe: false,
        };
        try {
          localStorage.setItem('careconnect_token', encrypt(JSON.stringify(sessionData)));
        } catch {}
        const cleanUser = { ...newUser };
        delete cleanUser.password_hash;
        set({
          user: cleanUser,
          profile: newProfile,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Legacy client-side registration (github mode).
        const existingUsers = await dbHelpers.find(collections.users, { email: userData.email });
        if (existingUsers.length > 0) {
          throw new Error('User already exists');
        }

        let entityId = null;
        if ([UserType.HEALTH_CENTER, UserType.PHARMACY].includes(userData.user_type)) {
          const newEntity = await dbHelpers.insert(collections.entities, {
            name: userData.entity_name,
            entity_type: userData.user_type,
            description: userData.entity_description,
            address: userData.entity_address,
            phone: userData.entity_phone,
            email: userData.entity_email || userData.email,
            verification_status: 'pending',
            is_active: true,
            services: userData.entity_services || [],
            specialties: userData.specialties || [],
            rating: 0,
            review_count: 0,
            badges: [],
          });
          entityId = newEntity.id;
        }

        const hashedPassword = await hashPassword(userData.password);
        newUser = await dbHelpers.insert(collections.users, {
          email: userData.email,
          phone: userData.phone,
          user_type: userData.user_type,
          password_hash: hashedPassword,
          is_verified: false,
          is_active: true,
          entity_id: entityId,
          permissions: getDefaultPermissions(userData.user_type),
        });

        newProfile = await dbHelpers.insert(collections.profiles, {
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
            data_sharing: false,
          },
        });

        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }

      // Trigger welcome + verification emails
      try {
        await triggerUserRegistered(
          newUser.email,
          `${newProfile.first_name} ${newProfile.last_name}`.trim(),
        );
        const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await emailEventHandler.trigger(EmailEvent.EMAIL_VERIFICATION_REQUESTED, {
          userEmail: newUser.email,
          userName: `${newProfile.first_name} ${newProfile.last_name}`.trim(),
          eventData: { verificationCode },
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
    console.log('Logout: Clearing session data');
    if (USE_BACKEND_AUTH) {
      // Fire-and-forget backend logout; local token clearance is what matters.
      apiClient.logout().catch(() => {});
    }
    localStorage.removeItem('careconnect_token');
    localStorage.removeItem('careconnect_api_token');
    sessionStorage.removeItem('careconnect_token');
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      requiresConsent: false,
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
    set({ isLoading: true });

    const clearSession = () => {
      localStorage.removeItem('careconnect_token');
      localStorage.removeItem('careconnect_api_token');
      sessionStorage.removeItem('careconnect_token');
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    try {
      if (USE_BACKEND_AUTH) {
        // Backend mode: rely on the signed server token + /auth/me.
        const apiToken = localStorage.getItem('careconnect_api_token');
        if (!apiToken) {
          clearSession();
          return;
        }
        try {
          const res = await apiClient.me();
          const cleanUser = { ...res.user };
          delete cleanUser.password_hash;
          set({
            user: cleanUser,
            profile: res.profile,
            isAuthenticated: true,
            isLoading: false,
          });
          // Consent versioning: re-check after session restore.
          try {
            await get().checkConsent(cleanUser.id);
          } catch (consentErr) {
            console.warn('refreshUser: consent check failed:', consentErr);
          }
        } catch {
          // Token invalid or expired.
          clearSession();
        }
        return;
      }

      // Legacy client-side mode (github): decrypt local session marker.
      let token = localStorage.getItem('careconnect_token');
      if (!token) {
        clearSession();
        return;
      }

      const decryptedData = decrypt(token);
      if (!decryptedData) {
        clearSession();
        return;
      }

      const sessionData = JSON.parse(decryptedData);
      if (Date.now() > sessionData.expires) {
        clearSession();
        return;
      }

      const user = await dbHelpers.findById(collections.users, sessionData.userId);
      if (user && user.is_active) {
        const profiles = await dbHelpers.find(collections.profiles, { user_id: sessionData.userId });
        const profile = profiles[0];
        const cleanUser = { ...user };
        delete cleanUser.password_hash;

        const newExpirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
        const newSessionData = { ...sessionData, expires: newExpirationTime };
        try {
          localStorage.setItem('careconnect_token', encrypt(JSON.stringify(newSessionData)));
        } catch {}

        set({
          user: cleanUser,
          profile,
          isAuthenticated: true,
          isLoading: false,
        });
        // Consent versioning: re-check after session restore.
        try {
          await get().checkConsent(cleanUser.id);
        } catch (consentErr) {
          console.warn('refreshUser: consent check failed:', consentErr);
        }
      } else {
        clearSession();
      }
    } catch (error) {
      console.error('RefreshUser: Error during token refresh:', error);
      clearSession();
    }
  },

  // --- Consent versioning ---

  // Fetch the current platform consent version from system_settings.
  // Falls back to the VITE_CURRENT_CONSENT_VERSION env var, then to '1.0.0'.
  // Public collection (no auth required) — safe to call before login.
  fetchCurrentConsentVersion: async () => {
    try {
      const rows = await dbHelpers.find(collections.system_settings, {
        key: 'current_consent_version',
      });
      const row = rows[0] as any;
      const version = (row?.value || row?.val || '').toString().trim();
      set({ currentConsentVersion: version || ENV_CONSENT_VERSION });
    } catch (err) {
      console.warn('fetchCurrentConsentVersion: falling back to env var:', err);
      set({ currentConsentVersion: ENV_CONSENT_VERSION });
    }
  },

  // Check whether the given user (or the currently-authenticated user) has
  // accepted the current consent version. Sets `requiresConsent` accordingly.
  checkConsent: async (userId?: string) => {
    const uid = userId || get().user?.id;
    if (!uid) {
      set({ requiresConsent: false });
      return;
    }
    // Make sure we have the latest consent version loaded.
    let version = get().currentConsentVersion;
    if (!version) {
      await get().fetchCurrentConsentVersion();
      version = get().currentConsentVersion;
    }
    if (!version) {
      // No version configured → no enforcement.
      set({ requiresConsent: false });
      return;
    }
    try {
      const records = (await dbHelpers.find(collections.consent_records, {
        user_id: uid,
      })) as Array<{ user_id: string; version?: string; accepted_at?: string }>;
      // Latest record by accepted_at (or created_at fallback).
      const latest = records
        .filter((r) => r && r.user_id === uid)
        .sort((a, b) => {
          const at = (x: any) => new Date(x.accepted_at || x.created_at || 0).getTime();
          return at(b) - at(a);
        })[0];
      const needsConsent = !latest || latest.version !== version;
      set({ requiresConsent: needsConsent });
    } catch (err) {
      console.warn('checkConsent: lookup failed, defaulting to required:', err);
      set({ requiresConsent: true });
    }
  },

  // Record the user's acceptance of the given consent version. Inserts a
  // consent_records row and clears `requiresConsent`. Returns false on error.
  acceptConsent: async (version: string) => {
    const { user } = get();
    if (!user) return false;
    try {
      await dbHelpers.insert(collections.consent_records, {
        user_id: user.id,
        version,
        accepted_at: new Date().toISOString(),
        ip_address: 'client',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        created_at: new Date().toISOString(),
      });
      set({ requiresConsent: false });
      return true;
    } catch (err) {
      console.error('acceptConsent: failed to record acceptance:', err);
      return false;
    }
  },
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
