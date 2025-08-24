// Medication Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { emailService, NotificationType } from './email-notifications';

// Medication Request Interface (eRx)
export interface MedicationRequest {
  id: string;
  patient_id: string;
  encounter_id?: string;
  entity_id: string;
  pharmacy_entity_id?: string;
  prescriber_id: string;
  
  // Prescription details
  prescription_number: string;
  status: 'draft' | 'active' | 'on_hold' | 'cancelled' | 'completed' | 'entered_in_error' | 'stopped' | 'unknown';
  intent: 'proposal' | 'plan' | 'order' | 'original_order' | 'reflex_order' | 'filler_order' | 'instance_order' | 'option';
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  
  // Medications array
  medications: Array<{
    drug_name: string;
    generic_name?: string;
    strength: string;
    form: string; // tablet, capsule, liquid, injection, etc.
    route: string; // oral, iv, im, topical, etc.
    frequency: string; // BID, TID, QID, PRN, etc.
    duration?: string;
    quantity: string;
    refills: number;
    instructions: string; // SIG - directions for use
    indication?: string;
  }>;
  
  // Dates
  authored_on: string;
  validity_period?: {
    start?: string;
    end?: string;
  };
  
  // Additional info
  notes?: string;
  reason_code?: string;
  reason_reference?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Medication Dispense Interface
export interface MedicationDispense {
  id: string;
  medication_request_id: string;
  pharmacy_entity_id: string;
  patient_id: string;
  
  // Dispense details
  status: 'preparation' | 'in_progress' | 'on_hold' | 'completed' | 'entered_in_error' | 'stopped' | 'declined' | 'unknown';
  type: 'trial_fill' | 'partial_fill' | 'emergency_fill' | 'samples' | 'refill';
  
  // What was dispensed
  dispensed_medications: Array<{
    drug_name: string;
    batch_number?: string;
    lot_number?: string;
    expiry_date?: string;
    manufacturer?: string;
    quantity_dispensed: string;
    days_supply?: number;
    unit_price?: number;
    total_price?: number;
  }>;
  
  // When and who
  dispensed_at?: string;
  dispenser_id?: string;
  prepared_by?: string;
  checked_by?: string;
  
  // Patient interaction
  counseling_provided: boolean;
  patient_acknowledged: boolean;
  pickup_method: 'in_person' | 'delivery' | 'mail' | 'curbside';
  pickup_by?: string; // If picked up by someone else
  
  // Notes and substitutions
  notes?: string;
  substitutions?: Array<{
    original_drug: string;
    substituted_drug: string;
    reason: string;
    type: 'generic' | 'therapeutic' | 'formulary';
  }>;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Patient Medication List
export interface PatientMedication {
  id: string;
  patient_id: string;
  
  // Medication details
  drug_name: string;
  generic_name?: string;
  strength: string;
  form: string;
  route: string;
  frequency: string;
  instructions: string;
  indication?: string;
  
  // Status and timeline
  status: 'active' | 'inactive' | 'completed' | 'discontinued' | 'paused';
  start_date: string;
  end_date?: string;
  
  // Source information
  source: 'prescribed' | 'otc' | 'supplement' | 'historical';
  prescriber_id?: string;
  entity_id?: string;
  medication_request_id?: string;
  
  // Adherence
  adherence_status?: 'compliant' | 'non_compliant' | 'unknown';
  last_refill_date?: string;
  next_refill_due?: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Drug Interaction
export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  management?: string;
}

// Basic drug interactions database (would be expanded in production)
const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    drug1: 'warfarin',
    drug2: 'aspirin',
    severity: 'major',
    description: 'Increased risk of bleeding',
    management: 'Monitor INR closely, consider alternative antiplatelet'
  },
  {
    drug1: 'metformin',
    drug2: 'contrast dye',
    severity: 'major',
    description: 'Risk of lactic acidosis',
    management: 'Discontinue metformin before contrast procedures'
  },
  {
    drug1: 'digoxin',
    drug2: 'furosemide',
    severity: 'moderate',
    description: 'Increased digoxin toxicity risk due to hypokalemia',
    management: 'Monitor potassium and digoxin levels'
  }
];

export class MedicationService {
  
  // Create medication request (eRx)
  static async createMedicationRequest(requestData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    pharmacy_entity_id?: string;
    prescriber_id: string;
    priority: MedicationRequest['priority'];
    medications: MedicationRequest['medications'];
    validity_period?: MedicationRequest['validity_period'];
    notes?: string;
    reason_code?: string;
  }): Promise<MedicationRequest> {
    try {
      // Generate prescription number
      const prescriptionNumber = await this.generatePrescriptionNumber();
      
      // Check for drug interactions
      const interactions = await this.checkDrugInteractions(
        requestData.patient_id,
        requestData.medications.map(m => m.drug_name)
      );
      
      if (interactions.some(i => i.severity === 'contraindicated')) {
        logger.warn('contraindicated_interaction_detected', 'Contraindicated drug interaction detected', {
          patient_id: requestData.patient_id,
          interactions: interactions.filter(i => i.severity === 'contraindicated')
        });
      }
      
      const medicationRequest = await githubDB.insert(collections.medication_requests, {
        ...requestData,
        prescription_number: prescriptionNumber,
        status: 'active',
        intent: 'order',
        authored_on: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Add medications to patient's medication list
      for (const med of requestData.medications) {
        await this.addToPatientMedicationList({
          patient_id: requestData.patient_id,
          drug_name: med.drug_name,
          generic_name: med.generic_name,
          strength: med.strength,
          form: med.form,
          route: med.route,
          frequency: med.frequency,
          instructions: med.instructions,
          indication: med.indication,
          source: 'prescribed',
          prescriber_id: requestData.prescriber_id,
          entity_id: requestData.entity_id,
          medication_request_id: medicationRequest.id
        });
      }
      
      // Notify pharmacy if specified
      if (requestData.pharmacy_entity_id) {
        await this.notifyPharmacy(medicationRequest.id, requestData.pharmacy_entity_id);
      }
      
      await this.logAuditEvent('medication_request_created', medicationRequest.id, requestData.prescriber_id);
      
      logger.info('medication_request_created', 'Medication request created successfully', {
        request_id: medicationRequest.id,
        prescription_number: prescriptionNumber,
        patient_id: requestData.patient_id,
        medication_count: requestData.medications.length
      });
      
      return medicationRequest;
    } catch (error) {
      logger.error('medication_request_creation_failed', 'Failed to create medication request', { error: error.message });
      throw error;
    }
  }
  
  // Update medication request status
  static async updateMedicationRequestStatus(requestId: string, status: MedicationRequest['status'], updatedBy: string, notes?: string): Promise<MedicationRequest> {
    try {
      const request = await githubDB.update(collections.medication_requests, requestId, {
        status: status,
        notes: notes ? `${notes}\n---\nStatus updated by ${updatedBy} at ${new Date().toISOString()}` : undefined,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('medication_request_status_updated', requestId, updatedBy, {
        new_status: status,
        notes: notes
      });
      
      return request;
    } catch (error) {
      logger.error('medication_request_status_update_failed', 'Failed to update medication request status', { 
        request_id: requestId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Create medication dispense
  static async createMedicationDispense(dispenseData: {
    medication_request_id: string;
    pharmacy_entity_id: string;
    patient_id: string;
    type: MedicationDispense['type'];
    dispensed_medications: MedicationDispense['dispensed_medications'];
    dispenser_id: string;
    prepared_by?: string;
    checked_by?: string;
    counseling_provided: boolean;
    pickup_method: MedicationDispense['pickup_method'];
    pickup_by?: string;
    notes?: string;
    substitutions?: MedicationDispense['substitutions'];
  }): Promise<MedicationDispense> {
    try {
      const dispense = await githubDB.insert(collections.medication_dispenses, {
        ...dispenseData,
        status: 'preparation',
        patient_acknowledged: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('medication_dispense_created', dispense.id, dispenseData.dispenser_id);
      
      logger.info('medication_dispense_created', 'Medication dispense created', {
        dispense_id: dispense.id,
        request_id: dispenseData.medication_request_id,
        pharmacy_id: dispenseData.pharmacy_entity_id
      });
      
      return dispense;
    } catch (error) {
      logger.error('medication_dispense_creation_failed', 'Failed to create medication dispense', { error: error.message });
      throw error;
    }
  }
  
  // Update dispense status
  static async updateDispenseStatus(dispenseId: string, status: MedicationDispense['status'], updatedBy: string): Promise<MedicationDispense> {
    try {
      const updates: any = {
        status: status,
        updated_at: new Date().toISOString()
      };
      
      if (status === 'completed') {
        updates.dispensed_at = new Date().toISOString();
        updates.patient_acknowledged = true;
      }
      
      const dispense = await githubDB.update(collections.medication_dispenses, dispenseId, updates);
      
      // Notify patient when ready for pickup
      if (status === 'completed') {
        await this.notifyPatientMedicationReady(dispenseId);
      }
      
      await this.logAuditEvent('medication_dispense_status_updated', dispenseId, updatedBy, {
        new_status: status
      });
      
      return dispense;
    } catch (error) {
      logger.error('medication_dispense_status_update_failed', 'Failed to update dispense status', { 
        dispense_id: dispenseId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get patient medication requests
  static async getPatientMedicationRequests(patientId: string, status?: MedicationRequest['status']): Promise<MedicationRequest[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (status) filters.status = status;
      
      const requests = await githubDB.find(collections.medication_requests, filters);
      
      return requests.sort((a, b) => new Date(b.authored_on).getTime() - new Date(a.authored_on).getTime());
    } catch (error) {
      logger.error('get_patient_medication_requests_failed', 'Failed to get patient medication requests', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get pharmacy pending requests
  static async getPharmacyPendingRequests(pharmacyEntityId: string): Promise<MedicationRequest[]> {
    try {
      const requests = await githubDB.find(collections.medication_requests, {
        pharmacy_entity_id: pharmacyEntityId,
        status: 'active'
      });
      
      return requests.sort((a, b) => new Date(a.authored_on).getTime() - new Date(b.authored_on).getTime());
    } catch (error) {
      logger.error('get_pharmacy_pending_requests_failed', 'Failed to get pharmacy pending requests', { 
        pharmacy_id: pharmacyEntityId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Add medication to patient list
  static async addToPatientMedicationList(medicationData: {
    patient_id: string;
    drug_name: string;
    generic_name?: string;
    strength: string;
    form: string;
    route: string;
    frequency: string;
    instructions: string;
    indication?: string;
    source: PatientMedication['source'];
    prescriber_id?: string;
    entity_id?: string;
    medication_request_id?: string;
    start_date?: string;
    notes?: string;
  }): Promise<PatientMedication> {
    try {
      const medication = await githubDB.insert(collections.medications, {
        ...medicationData,
        status: 'active',
        start_date: medicationData.start_date || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('medication_added_to_list', medication.id, medicationData.prescriber_id || 'system');
      
      return medication;
    } catch (error) {
      logger.error('add_medication_to_list_failed', 'Failed to add medication to patient list', { error: error.message });
      throw error;
    }
  }
  
  // Get patient active medications
  static async getPatientActiveMedications(patientId: string): Promise<PatientMedication[]> {
    try {
      const medications = await githubDB.find(collections.medications, {
        patient_id: patientId,
        status: 'active'
      });
      
      return medications.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    } catch (error) {
      logger.error('get_patient_active_medications_failed', 'Failed to get patient active medications', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Check drug interactions
  static async checkDrugInteractions(patientId: string, newDrugs: string[]): Promise<DrugInteraction[]> {
    try {
      // Get current active medications
      const currentMeds = await this.getPatientActiveMedications(patientId);
      const currentDrugs = currentMeds.map(med => med.drug_name.toLowerCase());
      
      // Combine with new drugs
      const allDrugs = [...currentDrugs, ...newDrugs.map(d => d.toLowerCase())];
      
      const interactions: DrugInteraction[] = [];
      
      // Check all combinations
      for (let i = 0; i < allDrugs.length; i++) {
        for (let j = i + 1; j < allDrugs.length; j++) {
          const drug1 = allDrugs[i];
          const drug2 = allDrugs[j];
          
          // Check both directions
          const interaction = DRUG_INTERACTIONS.find(inter => 
            (inter.drug1.toLowerCase() === drug1 && inter.drug2.toLowerCase() === drug2) ||
            (inter.drug1.toLowerCase() === drug2 && inter.drug2.toLowerCase() === drug1)
          );
          
          if (interaction) {
            interactions.push(interaction);
          }
        }
      }
      
      return interactions;
    } catch (error) {
      logger.error('check_drug_interactions_failed', 'Failed to check drug interactions', { error: error.message });
      return [];
    }
  }
  
  // Discontinue medication
  static async discontinueMedication(medicationId: string, discontinuedBy: string, reason?: string): Promise<PatientMedication> {
    try {
      const medication = await githubDB.update(collections.medications, medicationId, {
        status: 'discontinued',
        end_date: new Date().toISOString(),
        notes: reason ? `Discontinued: ${reason}` : 'Discontinued',
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('medication_discontinued', medicationId, discontinuedBy, { reason });
      
      return medication;
    } catch (error) {
      logger.error('discontinue_medication_failed', 'Failed to discontinue medication', { 
        medication_id: medicationId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Generate prescription number
  private static async generatePrescriptionNumber(): Promise<string> {
    const prefix = 'RX';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Notify pharmacy of new prescription
  private static async notifyPharmacy(requestId: string, pharmacyEntityId: string): Promise<void> {
    try {
      // Create notification record
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: pharmacyEntityId,
        type: 'new_prescription',
        title: 'New Prescription Received',
        message: `New prescription request ${requestId} requires processing`,
        data: { medication_request_id: requestId },
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      // Send email notification (if email service is configured)
      const pharmacy = await githubDB.findById(collections.entities, pharmacyEntityId);
      if (pharmacy) {
        await emailService.sendNotification({
          type: NotificationType.BOOKING_REQUEST,
          recipient: pharmacy.email,
          recipientName: pharmacy.name,
          data: {
            patientName: 'A patient',
            serviceName: 'Prescription Refill',
            requestId: requestId
          },
          priority: 'medium'
        });
      }
      
    } catch (error) {
      logger.error('notify_pharmacy_failed', 'Failed to notify pharmacy', { error: error.message });
    }
  }
  
  // Notify patient medication is ready
  private static async notifyPatientMedicationReady(dispenseId: string): Promise<void> {
    try {
      const dispense = await githubDB.findById(collections.medication_dispenses, dispenseId);
      if (!dispense) return;
      
      // Create notification
      await githubDB.insert(collections.notifications, {
        recipient_type: 'patient',
        recipient_id: dispense.patient_id,
        type: 'medication_ready',
        title: 'Prescription Ready for Pickup',
        message: 'Your prescription is ready for pickup at the pharmacy',
        data: { dispense_id: dispenseId },
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      // Send email notification
      const patient = await githubDB.findById(collections.patients, dispense.patient_id);
      if (patient) {
        await emailService.sendNotification({
          type: NotificationType.PRESCRIPTION_READY,
          recipient: patient.email,
          recipientName: `${patient.firstName} ${patient.lastName}`,
          data: {
            patientName: `${patient.firstName} ${patient.lastName}`,
            medication: dispense.dispensed_medications.map(m => m.drug_name).join(', '),
            pickupUrl: `/pharmacy/dispense/${dispense.id}`
          },
          priority: 'high'
        });
      }
      
    } catch (error) {
      logger.error('notify_patient_medication_ready_failed', 'Failed to notify patient', { error: error.message });
    }
  }
  
  // Get medication statistics for entity
  static async getMedicationStats(entityId: string, startDate: string, endDate: string): Promise<{
    total_prescriptions: number;
    total_medications: number;
    most_prescribed: Array<{ drug_name: string; count: number }>;
    by_status: { [key: string]: number };
  }> {
    try {
      let requests = await githubDB.find(collections.medication_requests, { entity_id: entityId });
      
      // Filter by date range
      requests = requests.filter(request => {
        const authoredDate = request.authored_on;
        return authoredDate >= startDate && authoredDate <= endDate;
      });
      
      const stats = {
        total_prescriptions: requests.length,
        total_medications: 0,
        most_prescribed: [] as Array<{ drug_name: string; count: number }>,
        by_status: {} as { [key: string]: number }
      };
      
      const drugCounts: { [key: string]: number } = {};
      
      requests.forEach(request => {
        // Count by status
        stats.by_status[request.status] = (stats.by_status[request.status] || 0) + 1;
        
        // Count medications
        stats.total_medications += request.medications.length;
        
        // Count individual drugs
        request.medications.forEach(med => {
          drugCounts[med.drug_name] = (drugCounts[med.drug_name] || 0) + 1;
        });
      });
      
      // Get most prescribed
      stats.most_prescribed = Object.entries(drugCounts)
        .map(([drug_name, count]) => ({ drug_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return stats;
    } catch (error) {
      logger.error('get_medication_stats_failed', 'Failed to get medication statistics', { error: error.message });
      return {
        total_prescriptions: 0,
        total_medications: 0,
        most_prescribed: [],
        by_status: {}
      };
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, resourceId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'medication',
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