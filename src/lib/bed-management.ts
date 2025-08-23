// Bed Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';

// Bed Interface
export interface Bed {
  id: string;
  entity_id: string;
  
  // Location details
  ward: string;
  room_number: string;
  bed_number: string;
  bed_type: 'regular' | 'icu' | 'nicu' | 'isolation' | 'private' | 'semi_private' | 'observation';
  
  // Status
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning' | 'reserved' | 'out_of_service';
  
  // Current occupancy
  current_encounter_id?: string;
  current_patient_id?: string;
  occupied_since?: string;
  
  // Features
  features: string[]; // ['oxygen', 'monitor', 'ventilator', 'isolation_capable']
  
  // Notes
  notes?: string;
  maintenance_notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Bed Transfer Interface
export interface BedTransfer {
  id: string;
  patient_id: string;
  encounter_id: string;
  entity_id: string;
  
  // Transfer details
  from_bed_id?: string;
  to_bed_id: string;
  transfer_reason: string;
  transfer_type: 'admission' | 'ward_transfer' | 'discharge' | 'room_change';
  
  // Timing
  requested_at: string;
  scheduled_at?: string;
  completed_at?: string;
  
  // Staff
  requested_by: string;
  approved_by?: string;
  completed_by?: string;
  
  // Status
  status: 'requested' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export class BedService {
  
  // Create bed
  static async createBed(bedData: {
    entity_id: string;
    ward: string;
    room_number: string;
    bed_number: string;
    bed_type: Bed['bed_type'];
    features: string[];
    notes?: string;
  }): Promise<Bed> {
    try {
      const bed = await githubDB.insert(collections.bed_management, {
        ...bedData,
        status: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('bed_created', bed.id, 'system');
      
      logger.info('bed_created', 'Bed created successfully', {
        bed_id: bed.id,
        ward: bedData.ward,
        room_number: bedData.room_number,
        bed_number: bedData.bed_number
      });
      
      return bed;
    } catch (error) {
      logger.error('bed_creation_failed', 'Failed to create bed', { error: error.message });
      throw error;
    }
  }
  
  // Allocate bed to patient
  static async allocateBed(entityId: string, ward: string, encounterId: string, patientId?: string, requiredFeatures?: string[]): Promise<Bed | null> {
    try {
      // Find available beds in the ward
      let availableBeds = await githubDB.find(collections.bed_management, {
        entity_id: entityId,
        ward: ward,
        status: 'available'
      });
      
      // Filter by required features if specified
      if (requiredFeatures && requiredFeatures.length > 0) {
        availableBeds = availableBeds.filter(bed => 
          requiredFeatures.every(feature => bed.features.includes(feature))
        );
      }
      
      if (availableBeds.length === 0) {
        logger.warn('no_beds_available', 'No beds available for allocation', {
          entity_id: entityId,
          ward: ward,
          required_features: requiredFeatures
        });
        return null;
      }
      
      // Allocate the first available bed
      const bed = availableBeds[0];
      const updatedBed = await githubDB.update(collections.bed_management, bed.id, {
        status: 'occupied',
        current_encounter_id: encounterId,
        current_patient_id: patientId,
        occupied_since: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('bed_allocated', bed.id, 'system', {
        encounter_id: encounterId,
        patient_id: patientId
      });
      
      logger.info('bed_allocated', 'Bed allocated successfully', {
        bed_id: bed.id,
        encounter_id: encounterId,
        ward: ward
      });
      
      return updatedBed;
    } catch (error) {
      logger.error('bed_allocation_failed', 'Failed to allocate bed', { error: error.message });
      return null;
    }
  }
  
  // Release bed
  static async releaseBed(bedId: string): Promise<Bed> {
    try {
      const bed = await githubDB.update(collections.bed_management, bedId, {
        status: 'cleaning', // Beds need cleaning before becoming available
        current_encounter_id: null,
        current_patient_id: null,
        occupied_since: null,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('bed_released', bedId, 'system');
      
      logger.info('bed_released', 'Bed released for cleaning', { bed_id: bedId });
      
      return bed;
    } catch (error) {
      logger.error('bed_release_failed', 'Failed to release bed', { 
        bed_id: bedId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Mark bed as available after cleaning
  static async markBedAvailable(bedId: string, cleanedBy: string): Promise<Bed> {
    try {
      const bed = await githubDB.update(collections.bed_management, bedId, {
        status: 'available',
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('bed_available', bedId, cleanedBy);
      
      logger.info('bed_available', 'Bed marked as available', { bed_id: bedId });
      
      return bed;
    } catch (error) {
      logger.error('bed_available_failed', 'Failed to mark bed as available', { 
        bed_id: bedId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Request bed transfer
  static async requestBedTransfer(transferData: {
    patient_id: string;
    encounter_id: string;
    entity_id: string;
    from_bed_id?: string;
    to_bed_id: string;
    transfer_reason: string;
    transfer_type: BedTransfer['transfer_type'];
    requested_by: string;
    scheduled_at?: string;
    notes?: string;
  }): Promise<BedTransfer> {
    try {
      // Check if target bed is available
      const targetBed = await githubDB.findById(collections.bed_management, transferData.to_bed_id);
      if (!targetBed || targetBed.status !== 'available') {
        throw new Error('Target bed is not available');
      }
      
      const transfer = await githubDB.insert(collections.bed_management, {
        ...transferData,
        status: 'requested',
        requested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('bed_transfer_requested', transfer.id, transferData.requested_by);
      
      logger.info('bed_transfer_requested', 'Bed transfer requested', {
        transfer_id: transfer.id,
        patient_id: transferData.patient_id,
        from_bed: transferData.from_bed_id,
        to_bed: transferData.to_bed_id
      });
      
      return transfer;
    } catch (error) {
      logger.error('bed_transfer_request_failed', 'Failed to request bed transfer', { error: error.message });
      throw error;
    }
  }
  
  // Complete bed transfer
  static async completeBedTransfer(transferId: string, completedBy: string): Promise<BedTransfer> {
    try {
      const transfer = await githubDB.findById(collections.bed_management, transferId);
      if (!transfer) throw new Error('Transfer not found');
      
      // Release old bed if exists
      if (transfer.from_bed_id) {
        await this.releaseBed(transfer.from_bed_id);
      }
      
      // Allocate new bed
      await githubDB.update(collections.bed_management, transfer.to_bed_id, {
        status: 'occupied',
        current_encounter_id: transfer.encounter_id,
        current_patient_id: transfer.patient_id,
        occupied_since: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Update transfer status
      const completedTransfer = await githubDB.update(collections.bed_management, transferId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: completedBy,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('bed_transfer_completed', transferId, completedBy);
      
      logger.info('bed_transfer_completed', 'Bed transfer completed', {
        transfer_id: transferId,
        completed_by: completedBy
      });
      
      return completedTransfer;
    } catch (error) {
      logger.error('bed_transfer_completion_failed', 'Failed to complete bed transfer', { 
        transfer_id: transferId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get ward occupancy
  static async getWardOccupancy(entityId: string, ward?: string): Promise<{
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    cleaning_beds: number;
    maintenance_beds: number;
    occupancy_rate: number;
    by_type: { [key: string]: { total: number; occupied: number } };
  }> {
    try {
      const filters: any = { entity_id: entityId };
      if (ward) filters.ward = ward;
      
      const beds = await githubDB.find(collections.bed_management, filters);
      
      const stats = {
        total_beds: beds.length,
        occupied_beds: 0,
        available_beds: 0,
        cleaning_beds: 0,
        maintenance_beds: 0,
        occupancy_rate: 0,
        by_type: {} as { [key: string]: { total: number; occupied: number } }
      };
      
      beds.forEach(bed => {
        // Count by status
        switch (bed.status) {
          case 'occupied':
            stats.occupied_beds++;
            break;
          case 'available':
            stats.available_beds++;
            break;
          case 'cleaning':
            stats.cleaning_beds++;
            break;
          case 'maintenance':
          case 'out_of_service':
            stats.maintenance_beds++;
            break;
        }
        
        // Count by type
        if (!stats.by_type[bed.bed_type]) {
          stats.by_type[bed.bed_type] = { total: 0, occupied: 0 };
        }
        stats.by_type[bed.bed_type].total++;
        if (bed.status === 'occupied') {
          stats.by_type[bed.bed_type].occupied++;
        }
      });
      
      // Calculate occupancy rate
      stats.occupancy_rate = stats.total_beds > 0 
        ? Math.round((stats.occupied_beds / stats.total_beds) * 100) 
        : 0;
      
      return stats;
    } catch (error) {
      logger.error('get_ward_occupancy_failed', 'Failed to get ward occupancy', { error: error.message });
      return {
        total_beds: 0,
        occupied_beds: 0,
        available_beds: 0,
        cleaning_beds: 0,
        maintenance_beds: 0,
        occupancy_rate: 0,
        by_type: {}
      };
    }
  }
  
  // Get beds by ward
  static async getBedsByWard(entityId: string, ward: string): Promise<Bed[]> {
    try {
      const beds = await githubDB.find(collections.bed_management, {
        entity_id: entityId,
        ward: ward
      });
      
      // Sort by room number and bed number
      return beds.sort((a, b) => {
        const roomCompare = a.room_number.localeCompare(b.room_number);
        if (roomCompare !== 0) return roomCompare;
        return a.bed_number.localeCompare(b.bed_number);
      });
    } catch (error) {
      logger.error('get_beds_by_ward_failed', 'Failed to get beds by ward', { error: error.message });
      return [];
    }
  }
  
  // Get available beds
  static async getAvailableBeds(entityId: string, ward?: string, bedType?: Bed['bed_type'], requiredFeatures?: string[]): Promise<Bed[]> {
    try {
      const filters: any = {
        entity_id: entityId,
        status: 'available'
      };
      
      if (ward) filters.ward = ward;
      if (bedType) filters.bed_type = bedType;
      
      let beds = await githubDB.find(collections.bed_management, filters);
      
      // Filter by required features
      if (requiredFeatures && requiredFeatures.length > 0) {
        beds = beds.filter(bed => 
          requiredFeatures.every(feature => bed.features.includes(feature))
        );
      }
      
      return beds.sort((a, b) => {
        const wardCompare = a.ward.localeCompare(b.ward);
        if (wardCompare !== 0) return wardCompare;
        const roomCompare = a.room_number.localeCompare(b.room_number);
        if (roomCompare !== 0) return roomCompare;
        return a.bed_number.localeCompare(b.bed_number);
      });
    } catch (error) {
      logger.error('get_available_beds_failed', 'Failed to get available beds', { error: error.message });
      return [];
    }
  }
  
  // Set bed maintenance
  static async setBedMaintenance(bedId: string, maintenanceNotes: string, setBy: string): Promise<Bed> {
    try {
      const bed = await githubDB.update(collections.bed_management, bedId, {
        status: 'maintenance',
        maintenance_notes: maintenanceNotes,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('bed_maintenance_set', bedId, setBy, {
        maintenance_notes: maintenanceNotes
      });
      
      return bed;
    } catch (error) {
      logger.error('bed_maintenance_set_failed', 'Failed to set bed maintenance', { 
        bed_id: bedId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, resourceId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'bed',
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