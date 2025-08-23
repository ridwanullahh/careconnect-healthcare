// Patient Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { encrypt, decrypt } from './encryption';
import { UserType } from './auth';
import { logger } from './observability';

// Patient Interface
export interface Patient {
  id: string;
  org_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Encrypted fields
  encrypted_name: string;
  encrypted_dob: string;
  encrypted_sex: string;
  encrypted_phones: string;
  encrypted_emails: string;
  encrypted_address: string;
  encrypted_emergency_contacts: string;
  
  // Non-encrypted fields
  patient_code: string;
  primary_entity_id: string;
  photo_url?: string;
  preferences: {
    language: string;
    communication_method: 'email' | 'sms' | 'phone';
    privacy_level: 'standard' | 'restricted';
  };
  
  // Status
  is_active: boolean;
  verification_status: 'pending' | 'verified' | 'suspended';
}

// Patient Identifier Interface
export interface PatientIdentifier {
  id: string;
  patient_id: string;
  type: 'mrn' | 'national_id' | 'insurance_id' | 'passport' | 'other';
  encrypted_value: string;
  issuer?: string;
  is_primary: boolean;
  created_at: string;
}

// Patient Entity Link Interface
export interface PatientEntityLink {
  id: string;
  patient_id: string;
  entity_id: string;
  relationship_type: 'primary_care' | 'specialist' | 'pharmacy' | 'lab' | 'imaging' | 'emergency';
  status: 'active' | 'inactive' | 'transferred';
  linked_at: string;
  linked_by: string;
  notes?: string;
}

// Decrypted Patient (for safe display)
export interface DecryptedPatient extends Omit<Patient, 'encrypted_name' | 'encrypted_dob' | 'encrypted_sex' | 'encrypted_phones' | 'encrypted_emails' | 'encrypted_address' | 'encrypted_emergency_contacts'> {
  name: string;
  dob: string;
  sex: string;
  phones: string[];
  emails: string[];
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  emergency_contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
}

export class PatientService {
  
  // Create patient with encrypted PHI
  static async createPatient(patientData: {
    name: string;
    dob: string;
    sex: string;
    phones: string[];
    emails: string[];
    address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    emergency_contacts: Array<{
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    }>;
    primary_entity_id: string;
    preferences: Patient['preferences'];
    created_by: string;
  }): Promise<Patient> {
    try {
      // Generate patient code
      const patientCode = await this.generatePatientCode();
      
      // Encrypt sensitive fields
      const encryptedData = {
        encrypted_name: await encrypt(patientData.name),
        encrypted_dob: await encrypt(patientData.dob),
        encrypted_sex: await encrypt(patientData.sex),
        encrypted_phones: await encrypt(JSON.stringify(patientData.phones)),
        encrypted_emails: await encrypt(JSON.stringify(patientData.emails)),
        encrypted_address: await encrypt(JSON.stringify(patientData.address)),
        encrypted_emergency_contacts: await encrypt(JSON.stringify(patientData.emergency_contacts))
      };
      
      const patient = await githubDB.insert(collections.patients, {
        ...encryptedData,
        patient_code: patientCode,
        primary_entity_id: patientData.primary_entity_id,
        preferences: patientData.preferences,
        is_active: true,
        verification_status: 'pending',
        created_by: patientData.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Create primary entity link
      await this.linkToEntity(patient.id, patientData.primary_entity_id, 'primary_care', patientData.created_by);
      
      // Log audit event
      await this.logAuditEvent('patient_created', patient.id, patientData.created_by);
      
      logger.info('patient_created', 'Patient created successfully', {
        patient_id: patient.id,
        patient_code: patientCode,
        created_by: patientData.created_by
      });
      
      return patient;
    } catch (error) {
      logger.error('patient_creation_failed', 'Failed to create patient', { error: error.message });
      throw error;
    }
  }
  
  // Update patient data
  static async updatePatient(patientId: string, updates: Partial<{
    name: string;
    dob: string;
    sex: string;
    phones: string[];
    emails: string[];
    address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
    emergency_contacts: Array<{
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    }>;
    preferences: Patient['preferences'];
  }>, updatedBy: string): Promise<Patient> {
    try {
      const encryptedUpdates: any = {};
      
      // Encrypt any sensitive field updates
      if (updates.name) encryptedUpdates.encrypted_name = await encrypt(updates.name);
      if (updates.dob) encryptedUpdates.encrypted_dob = await encrypt(updates.dob);
      if (updates.sex) encryptedUpdates.encrypted_sex = await encrypt(updates.sex);
      if (updates.phones) encryptedUpdates.encrypted_phones = await encrypt(JSON.stringify(updates.phones));
      if (updates.emails) encryptedUpdates.encrypted_emails = await encrypt(JSON.stringify(updates.emails));
      if (updates.address) encryptedUpdates.encrypted_address = await encrypt(JSON.stringify(updates.address));
      if (updates.emergency_contacts) encryptedUpdates.encrypted_emergency_contacts = await encrypt(JSON.stringify(updates.emergency_contacts));
      
      // Add non-encrypted updates
      if (updates.preferences) encryptedUpdates.preferences = updates.preferences;
      
      encryptedUpdates.updated_at = new Date().toISOString();
      
      const patient = await githubDB.update(collections.patients, patientId, encryptedUpdates);
      
      await this.logAuditEvent('patient_updated', patientId, updatedBy);
      
      logger.info('patient_updated', 'Patient updated successfully', {
        patient_id: patientId,
        updated_by: updatedBy
      });
      
      return patient;
    } catch (error) {
      logger.error('patient_update_failed', 'Failed to update patient', { 
        patient_id: patientId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Search patients with safe projections
  static async searchPatients(query: string, entityId?: string, limit: number = 50): Promise<Array<{
    id: string;
    patient_code: string;
    name_snippet: string;
    primary_entity_id: string;
    is_active: boolean;
  }>> {
    try {
      let patients = await githubDB.find(collections.patients, { is_active: true });
      
      // Filter by entity if specified
      if (entityId) {
        const links = await githubDB.find(collections.patient_entity_links, {
          entity_id: entityId,
          status: 'active'
        });
        const linkedPatientIds = links.map(link => link.patient_id);
        patients = patients.filter(patient => linkedPatientIds.includes(patient.id));
      }
      
      // Search and return safe projections
      const results = [];
      
      for (const patient of patients.slice(0, limit)) {
        try {
          const decryptedName = await decrypt(patient.encrypted_name);
          
          // Check if query matches
          if (decryptedName.toLowerCase().includes(query.toLowerCase()) || 
              patient.patient_code.toLowerCase().includes(query.toLowerCase())) {
            
            // Return safe snippet
            const nameWords = decryptedName.split(' ');
            const nameSnippet = nameWords.length > 1 
              ? `${nameWords[0]} ${nameWords[nameWords.length - 1][0]}***`
              : `${nameWords[0].substring(0, 3)}***`;
            
            results.push({
              id: patient.id,
              patient_code: patient.patient_code,
              name_snippet: nameSnippet,
              primary_entity_id: patient.primary_entity_id,
              is_active: patient.is_active
            });
          }
        } catch (decryptError) {
          // Skip patients with decryption errors
          continue;
        }
      }
      
      return results;
    } catch (error) {
      logger.error('patient_search_failed', 'Failed to search patients', { error: error.message });
      return [];
    }
  }
  
  // Get full patient details (decrypted)
  static async getPatientDetails(patientId: string, requestingUserId: string): Promise<DecryptedPatient | null> {
    try {
      const patient = await githubDB.findById(collections.patients, patientId);
      if (!patient) return null;
      
      // Decrypt sensitive fields
      const decryptedPatient: DecryptedPatient = {
        ...patient,
        name: await decrypt(patient.encrypted_name),
        dob: await decrypt(patient.encrypted_dob),
        sex: await decrypt(patient.encrypted_sex),
        phones: JSON.parse(await decrypt(patient.encrypted_phones)),
        emails: JSON.parse(await decrypt(patient.encrypted_emails)),
        address: JSON.parse(await decrypt(patient.encrypted_address)),
        emergency_contacts: JSON.parse(await decrypt(patient.encrypted_emergency_contacts))
      };
      
      // Log access
      await this.logAuditEvent('patient_accessed', patientId, requestingUserId);
      
      return decryptedPatient;
    } catch (error) {
      logger.error('patient_details_failed', 'Failed to get patient details', { 
        patient_id: patientId, 
        error: error.message 
      });
      return null;
    }
  }
  
  // Link patient to entity
  static async linkToEntity(patientId: string, entityId: string, relationshipType: PatientEntityLink['relationship_type'], linkedBy: string, notes?: string): Promise<PatientEntityLink> {
    try {
      const link = await githubDB.insert(collections.patient_entity_links, {
        patient_id: patientId,
        entity_id: entityId,
        relationship_type: relationshipType,
        status: 'active',
        linked_at: new Date().toISOString(),
        linked_by: linkedBy,
        notes: notes || ''
      });
      
      await this.logAuditEvent('patient_entity_linked', patientId, linkedBy, {
        entity_id: entityId,
        relationship_type: relationshipType
      });
      
      return link;
    } catch (error) {
      logger.error('patient_link_failed', 'Failed to link patient to entity', { error: error.message });
      throw error;
    }
  }
  
  // Unlink patient from entity
  static async unlinkFromEntity(patientId: string, entityId: string, unlinkedBy: string): Promise<void> {
    try {
      const links = await githubDB.find(collections.patient_entity_links, {
        patient_id: patientId,
        entity_id: entityId,
        status: 'active'
      });
      
      for (const link of links) {
        await githubDB.update(collections.patient_entity_links, link.id, {
          status: 'inactive',
          updated_at: new Date().toISOString()
        });
      }
      
      await this.logAuditEvent('patient_entity_unlinked', patientId, unlinkedBy, {
        entity_id: entityId
      });
    } catch (error) {
      logger.error('patient_unlink_failed', 'Failed to unlink patient from entity', { error: error.message });
      throw error;
    }
  }
  
  // Add patient identifier
  static async addIdentifier(patientId: string, type: PatientIdentifier['type'], value: string, issuer?: string, isPrimary: boolean = false): Promise<PatientIdentifier> {
    try {
      const identifier = await githubDB.insert(collections.patient_identifiers, {
        patient_id: patientId,
        type: type,
        encrypted_value: await encrypt(value),
        issuer: issuer,
        is_primary: isPrimary,
        created_at: new Date().toISOString()
      });
      
      return identifier;
    } catch (error) {
      logger.error('patient_identifier_failed', 'Failed to add patient identifier', { error: error.message });
      throw error;
    }
  }
  
  // Generate unique patient code
  private static async generatePatientCode(): Promise<string> {
    const prefix = 'PT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, patientId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'patient',
        resource_id: patientId,
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
  
  // Get patient's linked entities
  static async getLinkedEntities(patientId: string): Promise<PatientEntityLink[]> {
    try {
      return await githubDB.find(collections.patient_entity_links, {
        patient_id: patientId,
        status: 'active'
      });
    } catch (error) {
      logger.error('get_linked_entities_failed', 'Failed to get linked entities', { error: error.message });
      return [];
    }
  }
  
  // Consent management
  static async updateConsent(patientId: string, consentType: string, granted: boolean, updatedBy: string): Promise<void> {
    try {
      await githubDB.insert(collections.consents, {
        patient_id: patientId,
        consent_type: consentType,
        granted: granted,
        granted_at: new Date().toISOString(),
        granted_by: updatedBy,
        expires_at: null // Can be set for time-limited consents
      });
      
      await this.logAuditEvent('consent_updated', patientId, updatedBy, {
        consent_type: consentType,
        granted: granted
      });
    } catch (error) {
      logger.error('consent_update_failed', 'Failed to update consent', { error: error.message });
      throw error;
    }
  }
  
  // Check consent
  static async hasConsent(patientId: string, consentType: string): Promise<boolean> {
    try {
      const consents = await githubDB.find(collections.consents, {
        patient_id: patientId,
        consent_type: consentType,
        granted: true
      });
      
      return consents.length > 0;
    } catch (error) {
      logger.error('consent_check_failed', 'Failed to check consent', { error: error.message });
      return false;
    }
  }
}