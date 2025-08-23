// Access Grant Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { encrypt, decrypt } from './encryption';

// Access Grant Interface
export interface AccessGrant {
  id: string;
  patient_id: string;
  
  // Grantee details
  grantee_type: 'caregiver' | 'family_member' | 'healthcare_provider' | 'legal_guardian' | 'emergency_contact' | 'other';
  grantee_id?: string; // User ID if they have an account
  grantee_name: string;
  encrypted_grantee_contact: string; // Email/phone encrypted
  
  // Access details
  access_level: 'view_only' | 'limited' | 'full' | 'emergency_only';
  scope: Array<'demographics' | 'medical_history' | 'medications' | 'lab_results' | 'imaging' | 'appointments' | 'billing' | 'all'>;
  
  // Permissions
  can_view_records: boolean;
  can_schedule_appointments: boolean;
  can_receive_notifications: boolean;
  can_communicate_with_providers: boolean;
  
  // Time bounds
  granted_at: string;
  expires_at?: string;
  last_accessed_at?: string;
  
  // Security
  access_token?: string;
  pin_required: boolean;
  encrypted_pin?: string;
  
  // Status
  status: 'pending' | 'active' | 'suspended' | 'expired' | 'revoked';
  
  // Conditions
  emergency_only: boolean;
  require_patient_approval: boolean;
  
  // Audit
  granted_by: string; // Patient ID or guardian ID
  revoked_by?: string;
  revoked_at?: string;
  revoke_reason?: string;
  
  // Notes
  notes?: string;
  relationship_to_patient?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Access Log Interface
export interface AccessLog {
  id: string;
  access_grant_id: string;
  patient_id: string;
  grantee_id?: string;
  
  // Access details
  action: 'login' | 'view_record' | 'schedule_appointment' | 'download_report' | 'send_message' | 'other';
  resource_type?: string;
  resource_id?: string;
  
  // Context
  ip_address?: string;
  user_agent?: string;
  location?: string;
  
  // Result
  success: boolean;
  failure_reason?: string;
  
  // Timing
  accessed_at: string;
  session_duration?: number;
  
  // Metadata
  created_at: string;
}

export class AccessGrantService {
  
  // Create access grant
  static async createAccessGrant(grantData: {
    patient_id: string;
    grantee_type: AccessGrant['grantee_type'];
    grantee_id?: string;
    grantee_name: string;
    grantee_contact: string; // Will be encrypted
    access_level: AccessGrant['access_level'];
    scope: AccessGrant['scope'];
    can_view_records: boolean;
    can_schedule_appointments: boolean;
    can_receive_notifications: boolean;
    can_communicate_with_providers: boolean;
    expires_at?: string;
    pin_required: boolean;
    pin?: string; // Will be encrypted if provided
    emergency_only: boolean;
    require_patient_approval: boolean;
    granted_by: string;
    relationship_to_patient?: string;
    notes?: string;
  }): Promise<AccessGrant> {
    try {
      // Encrypt sensitive data
      const encryptedContact = await encrypt(grantData.grantee_contact);
      const encryptedPin = grantData.pin ? await encrypt(grantData.pin) : undefined;
      
      // Generate access token
      const accessToken = await this.generateAccessToken();
      
      const accessGrant = await githubDB.insert(collections.access_grants, {
        patient_id: grantData.patient_id,
        grantee_type: grantData.grantee_type,
        grantee_id: grantData.grantee_id,
        grantee_name: grantData.grantee_name,
        encrypted_grantee_contact: encryptedContact,
        access_level: grantData.access_level,
        scope: grantData.scope,
        can_view_records: grantData.can_view_records,
        can_schedule_appointments: grantData.can_schedule_appointments,
        can_receive_notifications: grantData.can_receive_notifications,
        can_communicate_with_providers: grantData.can_communicate_with_providers,
        granted_at: new Date().toISOString(),
        expires_at: grantData.expires_at,
        access_token: accessToken,
        pin_required: grantData.pin_required,
        encrypted_pin: encryptedPin,
        status: grantData.require_patient_approval ? 'pending' : 'active',
        emergency_only: grantData.emergency_only,
        require_patient_approval: grantData.require_patient_approval,
        granted_by: grantData.granted_by,
        relationship_to_patient: grantData.relationship_to_patient,
        notes: grantData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('access_grant_created', accessGrant.id, grantData.granted_by, {
        patient_id: grantData.patient_id,
        grantee_name: grantData.grantee_name,
        access_level: grantData.access_level
      });
      
      logger.info('access_grant_created', 'Access grant created successfully', {
        grant_id: accessGrant.id,
        patient_id: grantData.patient_id,
        grantee_name: grantData.grantee_name,
        access_level: grantData.access_level
      });
      
      return accessGrant;
    } catch (error) {
      logger.error('access_grant_creation_failed', 'Failed to create access grant', { error: error.message });
      throw error;
    }
  }
  
  // Approve access grant
  static async approveAccessGrant(grantId: string, approvedBy: string): Promise<AccessGrant> {
    try {
      const grant = await githubDB.update(collections.access_grants, grantId, {
        status: 'active',
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('access_grant_approved', grantId, approvedBy);
      
      logger.info('access_grant_approved', 'Access grant approved', {
        grant_id: grantId,
        approved_by: approvedBy
      });
      
      return grant;
    } catch (error) {
      logger.error('access_grant_approval_failed', 'Failed to approve access grant', { 
        grant_id: grantId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Revoke access grant
  static async revokeAccessGrant(grantId: string, revokedBy: string, reason?: string): Promise<AccessGrant> {
    try {
      const grant = await githubDB.update(collections.access_grants, grantId, {
        status: 'revoked',
        revoked_by: revokedBy,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('access_grant_revoked', grantId, revokedBy, {
        reason: reason
      });
      
      logger.info('access_grant_revoked', 'Access grant revoked', {
        grant_id: grantId,
        revoked_by: revokedBy,
        reason: reason
      });
      
      return grant;
    } catch (error) {
      logger.error('access_grant_revoke_failed', 'Failed to revoke access grant', { 
        grant_id: grantId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Validate access
  static async validateAccess(accessToken: string, action: string, resourceType?: string, pin?: string): Promise<{
    valid: boolean;
    grant?: AccessGrant;
    reason?: string;
  }> {
    try {
      // Find grant by access token
      const grants = await githubDB.find(collections.access_grants, {
        access_token: accessToken,
        status: 'active'
      });
      
      if (grants.length === 0) {
        return {
          valid: false,
          reason: 'Invalid access token'
        };
      }
      
      const grant = grants[0];
      
      // Check expiry
      if (grant.expires_at && new Date(grant.expires_at) < new Date()) {
        await githubDB.update(collections.access_grants, grant.id, {
          status: 'expired',
          updated_at: new Date().toISOString()
        });
        
        return {
          valid: false,
          reason: 'Access grant expired'
        };
      }
      
      // Check PIN if required
      if (grant.pin_required && grant.encrypted_pin) {
        if (!pin) {
          return {
            valid: false,
            reason: 'PIN required'
          };
        }
        
        const decryptedPin = await decrypt(grant.encrypted_pin);
        if (pin !== decryptedPin) {
          return {
            valid: false,
            reason: 'Invalid PIN'
          };
        }
      }
      
      // Check permissions for specific actions
      const hasPermission = this.checkPermission(grant, action, resourceType);
      if (!hasPermission) {
        return {
          valid: false,
          reason: 'Insufficient permissions'
        };
      }
      
      // Update last accessed
      await githubDB.update(collections.access_grants, grant.id, {
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return {
        valid: true,
        grant: grant
      };
    } catch (error) {
      logger.error('access_validation_failed', 'Failed to validate access', { error: error.message });
      return {
        valid: false,
        reason: 'Access validation error'
      };
    }
  }
  
  // Log access attempt
  static async logAccess(logData: {
    access_grant_id: string;
    patient_id: string;
    grantee_id?: string;
    action: AccessLog['action'];
    resource_type?: string;
    resource_id?: string;
    ip_address?: string;
    user_agent?: string;
    location?: string;
    success: boolean;
    failure_reason?: string;
    session_duration?: number;
  }): Promise<AccessLog> {
    try {
      const accessLog = await githubDB.insert(collections.access_logs, {
        ...logData,
        accessed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
      
      // Log significant access events
      if (logData.success) {
        logger.info('access_logged', 'Access logged successfully', {
          grant_id: logData.access_grant_id,
          action: logData.action,
          patient_id: logData.patient_id
        });
      } else {
        logger.warn('access_failed', 'Access attempt failed', {
          grant_id: logData.access_grant_id,
          action: logData.action,
          failure_reason: logData.failure_reason
        });
      }
      
      return accessLog;
    } catch (error) {
      logger.error('access_log_failed', 'Failed to log access', { error: error.message });
      throw error;
    }
  }
  
  // Get patient access grants
  static async getPatientAccessGrants(patientId: string, status?: AccessGrant['status']): Promise<AccessGrant[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (status) filters.status = status;
      
      const grants = await githubDB.find(collections.access_grants, filters);
      
      return grants.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      logger.error('get_patient_access_grants_failed', 'Failed to get patient access grants', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get grantee access grants
  static async getGranteeAccessGrants(granteeId: string): Promise<AccessGrant[]> {
    try {
      const grants = await githubDB.find(collections.access_grants, {
        grantee_id: granteeId,
        status: 'active'
      });
      
      return grants.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      logger.error('get_grantee_access_grants_failed', 'Failed to get grantee access grants', { 
        grantee_id: granteeId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get access logs
  static async getAccessLogs(grantId: string, limit?: number): Promise<AccessLog[]> {
    try {
      let logs = await githubDB.find(collections.access_logs, {
        access_grant_id: grantId
      });
      
      logs.sort((a, b) => new Date(b.accessed_at).getTime() - new Date(a.accessed_at).getTime());
      
      if (limit) logs = logs.slice(0, limit);
      
      return logs;
    } catch (error) {
      logger.error('get_access_logs_failed', 'Failed to get access logs', { 
        grant_id: grantId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get expiring grants
  static async getExpiringGrants(daysAhead: number = 7): Promise<AccessGrant[]> {
    try {
      const grants = await githubDB.find(collections.access_grants, {
        status: 'active'
      });
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
      
      return grants.filter(grant => {
        if (!grant.expires_at) return false;
        const expiryDate = new Date(grant.expires_at);
        return expiryDate <= cutoffDate && expiryDate > new Date();
      }).sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime());
    } catch (error) {
      logger.error('get_expiring_grants_failed', 'Failed to get expiring grants', { error: error.message });
      return [];
    }
  }
  
  // Update grant permissions
  static async updateGrantPermissions(grantId: string, permissions: {
    access_level?: AccessGrant['access_level'];
    scope?: AccessGrant['scope'];
    can_view_records?: boolean;
    can_schedule_appointments?: boolean;
    can_receive_notifications?: boolean;
    can_communicate_with_providers?: boolean;
    expires_at?: string;
  }, updatedBy: string): Promise<AccessGrant> {
    try {
      const grant = await githubDB.update(collections.access_grants, grantId, {
        ...permissions,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('access_grant_permissions_updated', grantId, updatedBy, permissions);
      
      return grant;
    } catch (error) {
      logger.error('update_grant_permissions_failed', 'Failed to update grant permissions', { 
        grant_id: grantId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Check permission for specific action
  private static checkPermission(grant: AccessGrant, action: string, resourceType?: string): boolean {
    // Emergency only check
    if (grant.emergency_only && action !== 'emergency_access') {
      return false;
    }
    
    // Access level checks
    switch (grant.access_level) {
      case 'view_only':
        return ['view_record', 'login'].includes(action);
      
      case 'limited':
        return ['view_record', 'login', 'send_message'].includes(action) ||
               (action === 'schedule_appointment' && grant.can_schedule_appointments);
      
      case 'emergency_only':
        return action === 'emergency_access';
      
      case 'full':
        break; // Full access continues to specific permission checks
    }
    
    // Specific permission checks
    switch (action) {
      case 'view_record':
        return grant.can_view_records;
      
      case 'schedule_appointment':
        return grant.can_schedule_appointments;
      
      case 'send_message':
        return grant.can_communicate_with_providers;
      
      case 'download_report':
        return grant.can_view_records;
      
      default:
        return true; // Allow other actions for full access
    }
  }
  
  // Generate secure access token
  private static async generateAccessToken(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 15);
    const combined = `${timestamp}_${random}`;
    return btoa(combined).replace(/[+/=]/g, '').substr(0, 32);
  }
  
  // Get access grant statistics
  static async getAccessGrantStats(patientId: string): Promise<{
    total_grants: number;
    active_grants: number;
    pending_grants: number;
    expired_grants: number;
    by_type: { [key: string]: number };
    by_access_level: { [key: string]: number };
    recent_access_count: number;
  }> {
    try {
      const grants = await this.getPatientAccessGrants(patientId);
      
      const stats = {
        total_grants: grants.length,
        active_grants: 0,
        pending_grants: 0,
        expired_grants: 0,
        by_type: {} as { [key: string]: number },
        by_access_level: {} as { [key: string]: number },
        recent_access_count: 0
      };
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      grants.forEach(grant => {
        // Count by status
        switch (grant.status) {
          case 'active':
            stats.active_grants++;
            break;
          case 'pending':
            stats.pending_grants++;
            break;
          case 'expired':
            stats.expired_grants++;
            break;
        }
        
        // Count by type
        stats.by_type[grant.grantee_type] = (stats.by_type[grant.grantee_type] || 0) + 1;
        
        // Count by access level
        stats.by_access_level[grant.access_level] = (stats.by_access_level[grant.access_level] || 0) + 1;
        
        // Count recent access
        if (grant.last_accessed_at && new Date(grant.last_accessed_at) >= oneWeekAgo) {
          stats.recent_access_count++;
        }
      });
      
      return stats;
    } catch (error) {
      logger.error('get_access_grant_stats_failed', 'Failed to get access grant statistics', { error: error.message });
      return {
        total_grants: 0,
        active_grants: 0,
        pending_grants: 0,
        expired_grants: 0,
        by_type: {},
        by_access_level: {},
        recent_access_count: 0
      };
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, grantId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'access_grant',
        resource_id: grantId,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: 'unknown',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
    } catch (error) {
      logger.error('audit_log_failed', 'Failed to log audit event', { error: error.message });
    }
  }
}