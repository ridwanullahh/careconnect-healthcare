// Consent Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';

// Consent Interface
export interface Consent {
  id: string;
  patient_id: string;
  entity_id: string;
  
  // Consent details
  consent_type: 'treatment' | 'data_sharing' | 'telehealth' | 'research' | 'photography' | 'marketing' | 'billing' | 'emergency_contact' | 'other';
  scope: string; // What the consent covers
  purpose: string; // Why consent is needed
  
  // Status
  status: 'pending' | 'granted' | 'denied' | 'withdrawn' | 'expired';
  
  // Timing
  granted_at?: string;
  expires_at?: string;
  withdrawn_at?: string;
  
  // Parties
  granted_by: string; // Patient ID or guardian ID
  witness_id?: string;
  obtained_by: string; // Staff member who obtained consent
  
  // Legal
  legal_basis?: string; // GDPR legal basis if applicable
  document_url?: string; // Link to signed consent form
  electronic_signature?: string;
  
  // Content
  consent_text: string;
  risks_disclosed?: string;
  alternatives_discussed?: string;
  
  // Conditions
  conditions?: Array<{
    condition: string;
    accepted: boolean;
  }>;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Consent Template Interface
export interface ConsentTemplate {
  id: string;
  entity_id: string;
  
  // Template details
  name: string;
  description: string;
  consent_type: Consent['consent_type'];
  version: string;
  
  // Content
  consent_text: string;
  risks_text?: string;
  alternatives_text?: string;
  
  // Default settings
  default_duration_days?: number;
  required_witness: boolean;
  electronic_signature_allowed: boolean;
  
  // Conditions
  standard_conditions: Array<{
    condition: string;
    required: boolean;
    default_value: boolean;
  }>;
  
  // Status
  is_active: boolean;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class ConsentService {
  
  // Create consent template
  static async createConsentTemplate(templateData: {
    entity_id: string;
    name: string;
    description: string;
    consent_type: ConsentTemplate['consent_type'];
    version: string;
    consent_text: string;
    risks_text?: string;
    alternatives_text?: string;
    default_duration_days?: number;
    required_witness: boolean;
    electronic_signature_allowed: boolean;
    standard_conditions: ConsentTemplate['standard_conditions'];
    created_by: string;
  }): Promise<ConsentTemplate> {
    try {
      const template = await githubDB.insert(collections.consent_templates, {
        ...templateData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('consent_template_created', template.id, templateData.created_by);
      
      logger.info('consent_template_created', 'Consent template created successfully', {
        template_id: template.id,
        name: templateData.name,
        consent_type: templateData.consent_type
      });
      
      return template;
    } catch (error) {
      logger.error('consent_template_creation_failed', 'Failed to create consent template', { error: error.message });
      throw error;
    }
  }
  
  // Obtain consent
  static async obtainConsent(consentData: {
    patient_id: string;
    entity_id: string;
    consent_type: Consent['consent_type'];
    scope: string;
    purpose: string;
    consent_text: string;
    risks_disclosed?: string;
    alternatives_discussed?: string;
    granted_by: string;
    witness_id?: string;
    obtained_by: string;
    duration_days?: number;
    legal_basis?: string;
    electronic_signature?: string;
    conditions?: Consent['conditions'];
    notes?: string;
  }): Promise<Consent> {
    try {
      const grantedAt = new Date().toISOString();
      let expiresAt = undefined;
      
      if (consentData.duration_days) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + consentData.duration_days);
        expiresAt = expiryDate.toISOString();
      }
      
      const consent = await githubDB.insert(collections.consents, {
        patient_id: consentData.patient_id,
        entity_id: consentData.entity_id,
        consent_type: consentData.consent_type,
        scope: consentData.scope,
        purpose: consentData.purpose,
        status: 'granted',
        granted_at: grantedAt,
        expires_at: expiresAt,
        granted_by: consentData.granted_by,
        witness_id: consentData.witness_id,
        obtained_by: consentData.obtained_by,
        legal_basis: consentData.legal_basis,
        electronic_signature: consentData.electronic_signature,
        consent_text: consentData.consent_text,
        risks_disclosed: consentData.risks_disclosed,
        alternatives_discussed: consentData.alternatives_discussed,
        conditions: consentData.conditions || [],
        notes: consentData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('consent_obtained', consent.id, consentData.obtained_by, {
        patient_id: consentData.patient_id,
        consent_type: consentData.consent_type,
        granted_by: consentData.granted_by
      });
      
      logger.info('consent_obtained', 'Consent obtained successfully', {
        consent_id: consent.id,
        patient_id: consentData.patient_id,
        consent_type: consentData.consent_type
      });
      
      return consent;
    } catch (error) {
      logger.error('consent_obtain_failed', 'Failed to obtain consent', { error: error.message });
      throw error;
    }
  }
  
  // Withdraw consent
  static async withdrawConsent(consentId: string, withdrawnBy: string, reason?: string): Promise<Consent> {
    try {
      const consent = await githubDB.update(collections.consents, consentId, {
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        notes: reason ? `Withdrawn: ${reason}` : 'Consent withdrawn',
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('consent_withdrawn', consentId, withdrawnBy, {
        reason: reason
      });
      
      logger.info('consent_withdrawn', 'Consent withdrawn', {
        consent_id: consentId,
        withdrawn_by: withdrawnBy
      });
      
      return consent;
    } catch (error) {
      logger.error('consent_withdraw_failed', 'Failed to withdraw consent', { 
        consent_id: consentId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Check if patient has valid consent
  static async hasValidConsent(patientId: string, entityId: string, consentType: Consent['consent_type'], scope?: string): Promise<{
    hasConsent: boolean;
    consent?: Consent;
    reason?: string;
  }> {
    try {
      const filters: any = {
        patient_id: patientId,
        entity_id: entityId,
        consent_type: consentType,
        status: 'granted'
      };
      
      if (scope) {
        filters.scope = scope;
      }
      
      const consents = await githubDB.find(collections.consents, filters);
      
      if (consents.length === 0) {
        return {
          hasConsent: false,
          reason: 'No consent found'
        };
      }
      
      // Check if any consent is still valid (not expired)
      const now = new Date();
      const validConsent = consents.find(consent => {
        if (!consent.expires_at) return true; // No expiry
        return new Date(consent.expires_at) > now;
      });
      
      if (!validConsent) {
        return {
          hasConsent: false,
          reason: 'Consent expired'
        };
      }
      
      return {
        hasConsent: true,
        consent: validConsent
      };
    } catch (error) {
      logger.error('check_consent_failed', 'Failed to check consent', { error: error.message });
      return {
        hasConsent: false,
        reason: 'Error checking consent'
      };
    }
  }
  
  // Get patient consents
  static async getPatientConsents(patientId: string, entityId?: string, consentType?: Consent['consent_type']): Promise<Consent[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (entityId) filters.entity_id = entityId;
      if (consentType) filters.consent_type = consentType;
      
      const consents = await githubDB.find(collections.consents, filters);
      
      return consents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      logger.error('get_patient_consents_failed', 'Failed to get patient consents', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get entity consent templates
  static async getConsentTemplates(entityId: string, consentType?: ConsentTemplate['consent_type']): Promise<ConsentTemplate[]> {
    try {
      const filters: any = { 
        entity_id: entityId,
        is_active: true 
      };
      if (consentType) filters.consent_type = consentType;
      
      const templates = await githubDB.find(collections.consent_templates, filters);
      
      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      logger.error('get_consent_templates_failed', 'Failed to get consent templates', { 
        entity_id: entityId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Create consent from template
  static async createConsentFromTemplate(templateId: string, consentData: {
    patient_id: string;
    granted_by: string;
    witness_id?: string;
    obtained_by: string;
    duration_days?: number;
    electronic_signature?: string;
    custom_conditions?: Consent['conditions'];
    notes?: string;
  }): Promise<Consent> {
    try {
      const template = await githubDB.findById(collections.consent_templates, templateId);
      if (!template) {
        throw new Error('Consent template not found');
      }
      
      // Merge template conditions with custom conditions
      const conditions = [
        ...template.standard_conditions.map(sc => ({
          condition: sc.condition,
          accepted: sc.default_value
        })),
        ...(consentData.custom_conditions || [])
      ];
      
      const consent = await this.obtainConsent({
        patient_id: consentData.patient_id,
        entity_id: template.entity_id,
        consent_type: template.consent_type,
        scope: template.name,
        purpose: template.description,
        consent_text: template.consent_text,
        risks_disclosed: template.risks_text,
        alternatives_discussed: template.alternatives_text,
        granted_by: consentData.granted_by,
        witness_id: consentData.witness_id,
        obtained_by: consentData.obtained_by,
        duration_days: consentData.duration_days || template.default_duration_days,
        electronic_signature: consentData.electronic_signature,
        conditions: conditions,
        notes: consentData.notes
      });
      
      await this.logAuditEvent('consent_created_from_template', consent.id, consentData.obtained_by, {
        template_id: templateId,
        template_name: template.name
      });
      
      return consent;
    } catch (error) {
      logger.error('create_consent_from_template_failed', 'Failed to create consent from template', { 
        template_id: templateId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get expiring consents
  static async getExpiringConsents(entityId: string, daysAhead: number = 30): Promise<Consent[]> {
    try {
      const consents = await githubDB.find(collections.consents, {
        entity_id: entityId,
        status: 'granted'
      });
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
      
      return consents.filter(consent => {
        if (!consent.expires_at) return false; // No expiry date
        const expiryDate = new Date(consent.expires_at);
        return expiryDate <= cutoffDate && expiryDate > new Date();
      }).sort((a, b) => new Date(a.expires_at!).getTime() - new Date(b.expires_at!).getTime());
    } catch (error) {
      logger.error('get_expiring_consents_failed', 'Failed to get expiring consents', { error: error.message });
      return [];
    }
  }
  
  // Renew consent
  static async renewConsent(originalConsentId: string, renewalData: {
    duration_days?: number;
    electronic_signature?: string;
    obtained_by: string;
    notes?: string;
  }): Promise<Consent> {
    try {
      const originalConsent = await githubDB.findById(collections.consents, originalConsentId);
      if (!originalConsent) {
        throw new Error('Original consent not found');
      }
      
      // Create new consent based on original
      const renewedConsent = await this.obtainConsent({
        patient_id: originalConsent.patient_id,
        entity_id: originalConsent.entity_id,
        consent_type: originalConsent.consent_type,
        scope: originalConsent.scope,
        purpose: originalConsent.purpose,
        consent_text: originalConsent.consent_text,
        risks_disclosed: originalConsent.risks_disclosed,
        alternatives_discussed: originalConsent.alternatives_discussed,
        granted_by: originalConsent.granted_by,
        obtained_by: renewalData.obtained_by,
        duration_days: renewalData.duration_days,
        electronic_signature: renewalData.electronic_signature,
        conditions: originalConsent.conditions,
        notes: `Renewed from consent ${originalConsentId}. ${renewalData.notes || ''}`
      });
      
      // Mark original consent as expired
      await githubDB.update(collections.consents, originalConsentId, {
        status: 'expired',
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('consent_renewed', renewedConsent.id, renewalData.obtained_by, {
        original_consent_id: originalConsentId
      });
      
      return renewedConsent;
    } catch (error) {
      logger.error('consent_renewal_failed', 'Failed to renew consent', { 
        original_consent_id: originalConsentId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get consent statistics
  static async getConsentStats(entityId: string, startDate: string, endDate: string): Promise<{
    total_consents: number;
    by_type: { [key: string]: number };
    by_status: { [key: string]: number };
    expiring_soon: number;
    withdrawal_rate: number;
  }> {
    try {
      let consents = await githubDB.find(collections.consents, { entity_id: entityId });
      
      // Filter by date range
      consents = consents.filter(consent => {
        const consentDate = consent.created_at;
        return consentDate >= startDate && consentDate <= endDate;
      });
      
      const stats = {
        total_consents: consents.length,
        by_type: {} as { [key: string]: number },
        by_status: {} as { [key: string]: number },
        expiring_soon: 0,
        withdrawal_rate: 0
      };
      
      let withdrawnCount = 0;
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      consents.forEach(consent => {
        // Count by type
        stats.by_type[consent.consent_type] = (stats.by_type[consent.consent_type] || 0) + 1;
        
        // Count by status
        stats.by_status[consent.status] = (stats.by_status[consent.status] || 0) + 1;
        
        // Count withdrawn
        if (consent.status === 'withdrawn') {
          withdrawnCount++;
        }
        
        // Count expiring soon
        if (consent.expires_at && new Date(consent.expires_at) <= nextMonth && consent.status === 'granted') {
          stats.expiring_soon++;
        }
      });
      
      // Calculate withdrawal rate
      stats.withdrawal_rate = stats.total_consents > 0 ? (withdrawnCount / stats.total_consents) * 100 : 0;
      
      return stats;
    } catch (error) {
      logger.error('get_consent_stats_failed', 'Failed to get consent statistics', { error: error.message });
      return {
        total_consents: 0,
        by_type: {},
        by_status: {},
        expiring_soon: 0,
        withdrawal_rate: 0
      };
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, resourceId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'consent',
        resource_id: resourceId,
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