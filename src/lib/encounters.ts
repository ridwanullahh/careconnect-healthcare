// Encounter Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { BedService } from './bed-management';

// Encounter Interface
export interface Encounter {
  id: string;
  patient_id: string;
  entity_id: string;
  encounter_code: string;
  
  // Type and status
  type: 'opd' | 'emergency' | 'inpatient' | 'telehealth' | 'lab' | 'imaging';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  priority: 'routine' | 'urgent' | 'emergency';
  
  // Timing
  scheduled_start: string;
  actual_start?: string;
  actual_end?: string;
  estimated_duration?: number; // in minutes
  
  // Clinical details
  chief_complaint?: string;
  reason_for_visit: string;
  department?: string;
  attending_physician_id?: string;
  assigned_nurse_id?: string;
  
  // Admission details (for inpatient)
  admission_type?: 'elective' | 'emergency' | 'observation';
  bed_id?: string;
  ward?: string;
  discharge_disposition?: 'home' | 'transfer' | 'ama' | 'expired';
  
  // Billing
  estimated_cost?: number;
  final_cost?: number;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

// Encounter Status History
export interface EncounterStatusHistory {
  id: string;
  encounter_id: string;
  from_status: string;
  to_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

export class EncounterService {
  
  // Create new encounter
  static async createEncounter(encounterData: {
    patient_id: string;
    entity_id: string;
    type: Encounter['type'];
    priority: Encounter['priority'];
    scheduled_start: string;
    reason_for_visit: string;
    chief_complaint?: string;
    department?: string;
    attending_physician_id?: string;
    assigned_nurse_id?: string;
    admission_type?: Encounter['admission_type'];
    estimated_duration?: number;
    created_by: string;
  }): Promise<Encounter> {
    try {
      // Generate encounter code
      const encounterCode = await this.generateEncounterCode(encounterData.type);
      
      const encounter = await githubDB.insert(collections.encounters, {
        ...encounterData,
        encounter_code: encounterCode,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Log status change
      await this.logStatusChange(encounter.id, '', 'scheduled', encounterData.created_by);
      
      // If inpatient, try to allocate bed
      if (encounterData.type === 'inpatient' && encounterData.department) {
        try {
          const bed = await BedService.allocateBed(encounterData.entity_id, encounterData.department, encounter.id);
          if (bed) {
            await githubDB.update(collections.encounters, encounter.id, {
              bed_id: bed.id,
              ward: bed.ward,
              updated_at: new Date().toISOString()
            });
          }
        } catch (bedError) {
          logger.warn('bed_allocation_failed', 'Failed to allocate bed for encounter', {
            encounter_id: encounter.id,
            error: bedError.message
          });
        }
      }
      
      await this.logAuditEvent('encounter_created', encounter.id, encounterData.created_by);
      
      logger.info('encounter_created', 'Encounter created successfully', {
        encounter_id: encounter.id,
        encounter_code: encounterCode,
        type: encounterData.type,
        patient_id: encounterData.patient_id
      });
      
      return encounter;
    } catch (error) {
      logger.error('encounter_creation_failed', 'Failed to create encounter', { error: error.message });
      throw error;
    }
  }
  
  // Update encounter status
  static async updateStatus(encounterId: string, newStatus: Encounter['status'], updatedBy: string, reason?: string): Promise<Encounter> {
    try {
      const encounter = await githubDB.findById(collections.encounters, encounterId);
      if (!encounter) throw new Error('Encounter not found');
      
      const oldStatus = encounter.status;
      
      // Validate status transition
      if (!this.isValidStatusTransition(oldStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }
      
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // Set timestamps based on status
      if (newStatus === 'in_progress' && !encounter.actual_start) {
        updates.actual_start = new Date().toISOString();
      }
      
      if (['completed', 'cancelled', 'no_show'].includes(newStatus) && !encounter.actual_end) {
        updates.actual_end = new Date().toISOString();
      }
      
      const updatedEncounter = await githubDB.update(collections.encounters, encounterId, updates);
      
      // Log status change
      await this.logStatusChange(encounterId, oldStatus, newStatus, updatedBy, reason);
      
      // Handle bed release for inpatient encounters
      if (newStatus === 'completed' && encounter.type === 'inpatient' && encounter.bed_id) {
        try {
          await BedService.releaseBed(encounter.bed_id);
        } catch (bedError) {
          logger.warn('bed_release_failed', 'Failed to release bed', {
            encounter_id: encounterId,
            bed_id: encounter.bed_id,
            error: bedError.message
          });
        }
      }
      
      await this.logAuditEvent('encounter_status_updated', encounterId, updatedBy, {
        old_status: oldStatus,
        new_status: newStatus,
        reason: reason
      });
      
      logger.info('encounter_status_updated', 'Encounter status updated', {
        encounter_id: encounterId,
        old_status: oldStatus,
        new_status: newStatus
      });
      
      return updatedEncounter;
    } catch (error) {
      logger.error('encounter_status_update_failed', 'Failed to update encounter status', { 
        encounter_id: encounterId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get encounters by patient
  static async getPatientEncounters(patientId: string, limit?: number, status?: Encounter['status']): Promise<Encounter[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (status) filters.status = status;
      
      let encounters = await githubDB.find(collections.encounters, filters);
      
      // Sort by scheduled_start descending
      encounters.sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());
      
      if (limit) encounters = encounters.slice(0, limit);
      
      return encounters;
    } catch (error) {
      logger.error('get_patient_encounters_failed', 'Failed to get patient encounters', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get encounters by entity and date range
  static async getEntityEncounters(entityId: string, startDate: string, endDate: string, type?: Encounter['type']): Promise<Encounter[]> {
    try {
      const filters: any = { entity_id: entityId };
      if (type) filters.type = type;
      
      let encounters = await githubDB.find(collections.encounters, filters);
      
      // Filter by date range
      encounters = encounters.filter(encounter => {
        const encounterDate = encounter.scheduled_start;
        return encounterDate >= startDate && encounterDate <= endDate;
      });
      
      // Sort by scheduled_start
      encounters.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
      
      return encounters;
    } catch (error) {
      logger.error('get_entity_encounters_failed', 'Failed to get entity encounters', { 
        entity_id: entityId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Update encounter details
  static async updateEncounter(encounterId: string, updates: Partial<{
    chief_complaint: string;
    reason_for_visit: string;
    department: string;
    attending_physician_id: string;
    assigned_nurse_id: string;
    estimated_duration: number;
    estimated_cost: number;
    final_cost: number;
    discharge_disposition: Encounter['discharge_disposition'];
    notes: string;
  }>, updatedBy: string): Promise<Encounter> {
    try {
      const encounter = await githubDB.update(collections.encounters, encounterId, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('encounter_updated', encounterId, updatedBy, updates);
      
      return encounter;
    } catch (error) {
      logger.error('encounter_update_failed', 'Failed to update encounter', { 
        encounter_id: encounterId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get encounter details with related data
  static async getEncounterDetails(encounterId: string): Promise<{
    encounter: Encounter;
    vitals: any[];
    conditions: any[];
    medications: any[];
    lab_orders: any[];
    imaging_orders: any[];
    documents: any[];
  } | null> {
    try {
      const encounter = await githubDB.findById(collections.encounters, encounterId);
      if (!encounter) return null;
      
      // Get related data
      const [vitals, conditions, medications, lab_orders, imaging_orders, documents] = await Promise.all([
        githubDB.find(collections.vitals, { encounter_id: encounterId }),
        githubDB.find(collections.conditions, { encounter_id: encounterId }),
        githubDB.find(collections.medication_requests, { encounter_id: encounterId }),
        githubDB.find(collections.lab_orders, { encounter_id: encounterId }),
        githubDB.find(collections.imaging_orders, { encounter_id: encounterId }),
        githubDB.find(collections.documents, { encounter_id: encounterId })
      ]);
      
      return {
        encounter,
        vitals,
        conditions,
        medications,
        lab_orders,
        imaging_orders,
        documents
      };
    } catch (error) {
      logger.error('get_encounter_details_failed', 'Failed to get encounter details', { 
        encounter_id: encounterId, 
        error: error.message 
      });
      return null;
    }
  }
  
  // Generate admission number for inpatient encounters
  static async generateAdmissionNumber(entityId: string): Promise<string> {
    const prefix = 'ADM';
    const entityCode = entityId.slice(-4).toUpperCase();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${entityCode}${date}${random}`;
  }
  
  // Check for appointment conflicts
  static async checkConflicts(entityId: string, scheduledStart: string, estimatedDuration: number = 30, excludeEncounterId?: string): Promise<Encounter[]> {
    try {
      const startTime = new Date(scheduledStart);
      const endTime = new Date(startTime.getTime() + estimatedDuration * 60000);
      
      let encounters = await githubDB.find(collections.encounters, {
        entity_id: entityId,
        status: 'scheduled'
      });
      
      if (excludeEncounterId) {
        encounters = encounters.filter(e => e.id !== excludeEncounterId);
      }
      
      const conflicts = encounters.filter(encounter => {
        const encounterStart = new Date(encounter.scheduled_start);
        const encounterEnd = new Date(encounterStart.getTime() + (encounter.estimated_duration || 30) * 60000);
        
        return (startTime < encounterEnd && endTime > encounterStart);
      });
      
      return conflicts;
    } catch (error) {
      logger.error('check_conflicts_failed', 'Failed to check appointment conflicts', { error: error.message });
      return [];
    }
  }
  
  // Generate encounter code
  private static async generateEncounterCode(type: Encounter['type']): Promise<string> {
    const typePrefix = {
      'opd': 'OPD',
      'emergency': 'EMR',
      'inpatient': 'IPD',
      'telehealth': 'TEL',
      'lab': 'LAB',
      'imaging': 'IMG'
    };
    
    const prefix = typePrefix[type] || 'ENC';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Validate status transitions
  private static isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
    const validTransitions: { [key: string]: string[] } = {
      'scheduled': ['in_progress', 'cancelled', 'no_show'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // Terminal state
      'cancelled': [], // Terminal state
      'no_show': [] // Terminal state
    };
    
    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }
  
  // Log status change
  private static async logStatusChange(encounterId: string, fromStatus: string, toStatus: string, changedBy: string, reason?: string): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action: 'encounter_status_change',
        resource_type: 'encounter',
        resource_id: encounterId,
        user_id: changedBy,
        metadata: {
          from_status: fromStatus,
          to_status: toStatus,
          reason: reason
        },
        timestamp: new Date().toISOString(),
        ip_address: 'unknown',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
    } catch (error) {
      logger.error('status_change_log_failed', 'Failed to log status change', { error: error.message });
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, encounterId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'encounter',
        resource_id: encounterId,
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
  
  // Get encounter statistics for entity
  static async getEncounterStats(entityId: string, startDate: string, endDate: string): Promise<{
    total: number;
    by_type: { [key: string]: number };
    by_status: { [key: string]: number };
    average_duration: number;
    no_show_rate: number;
  }> {
    try {
      const encounters = await this.getEntityEncounters(entityId, startDate, endDate);
      
      const stats = {
        total: encounters.length,
        by_type: {} as { [key: string]: number },
        by_status: {} as { [key: string]: number },
        average_duration: 0,
        no_show_rate: 0
      };
      
      let totalDuration = 0;
      let completedCount = 0;
      let noShowCount = 0;
      
      encounters.forEach(encounter => {
        // Count by type
        stats.by_type[encounter.type] = (stats.by_type[encounter.type] || 0) + 1;
        
        // Count by status
        stats.by_status[encounter.status] = (stats.by_status[encounter.status] || 0) + 1;
        
        // Calculate average duration for completed encounters
        if (encounter.status === 'completed' && encounter.actual_start && encounter.actual_end) {
          const duration = new Date(encounter.actual_end).getTime() - new Date(encounter.actual_start).getTime();
          totalDuration += duration / (1000 * 60); // Convert to minutes
          completedCount++;
        }
        
        // Count no-shows
        if (encounter.status === 'no_show') {
          noShowCount++;
        }
      });
      
      stats.average_duration = completedCount > 0 ? totalDuration / completedCount : 0;
      stats.no_show_rate = encounters.length > 0 ? (noShowCount / encounters.length) * 100 : 0;
      
      return stats;
    } catch (error) {
      logger.error('get_encounter_stats_failed', 'Failed to get encounter statistics', { error: error.message });
      return {
        total: 0,
        by_type: {},
        by_status: {},
        average_duration: 0,
        no_show_rate: 0
      };
    }
  }
}