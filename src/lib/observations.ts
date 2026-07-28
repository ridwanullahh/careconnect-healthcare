// Observation Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';

// Vital Signs Interface
export interface Vital {
  id: string;
  patient_id: string;
  encounter_id?: string;
  entity_id: string;
  
  // Observation details
  type: 'blood_pressure' | 'heart_rate' | 'respiratory_rate' | 'temperature' | 'oxygen_saturation' | 'height' | 'weight' | 'bmi' | 'pain_scale' | 'glucose' | 'other';
  code?: string; // LOINC-like code
  display_name: string;
  
  // Values
  value_quantity?: number;
  value_string?: string;
  unit?: string;
  
  // Structured values (e.g., BP)
  systolic?: number;
  diastolic?: number;
  
  // Reference ranges
  reference_range?: {
    low?: number;
    high?: number;
    text?: string;
  };
  
  // Flags
  is_abnormal: boolean;
  abnormal_flag?: 'high' | 'low' | 'critical_high' | 'critical_low';
  
  // Metadata
  measured_at: string;
  performer_id: string;
  device_used?: string;
  method?: string;
  body_site?: string;
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

// Observation templates for common vitals
export const VITAL_TEMPLATES = {
  blood_pressure: {
    type: 'blood_pressure',
    display_name: 'Blood Pressure',
    unit: 'mmHg',
    reference_range: { low: 90, high: 140, text: '90-140/60-90 mmHg' }
  },
  heart_rate: {
    type: 'heart_rate',
    display_name: 'Heart Rate',
    unit: 'bpm',
    reference_range: { low: 60, high: 100, text: '60-100 bpm' }
  },
  respiratory_rate: {
    type: 'respiratory_rate',
    display_name: 'Respiratory Rate',
    unit: 'breaths/min',
    reference_range: { low: 12, high: 20, text: '12-20 breaths/min' }
  },
  temperature: {
    type: 'temperature',
    display_name: 'Temperature',
    unit: '°C',
    reference_range: { low: 36.1, high: 37.2, text: '36.1-37.2°C' }
  },
  oxygen_saturation: {
    type: 'oxygen_saturation',
    display_name: 'Oxygen Saturation',
    unit: '%',
    reference_range: { low: 95, high: 100, text: '95-100%' }
  },
  height: {
    type: 'height',
    display_name: 'Height',
    unit: 'cm',
    reference_range: { text: 'Age and gender dependent' }
  },
  weight: {
    type: 'weight',
    display_name: 'Weight',
    unit: 'kg',
    reference_range: { text: 'Age, height and gender dependent' }
  },
  bmi: {
    type: 'bmi',
    display_name: 'BMI',
    unit: 'kg/m²',
    reference_range: { low: 18.5, high: 24.9, text: '18.5-24.9 kg/m²' }
  },
  pain_scale: {
    type: 'pain_scale',
    display_name: 'Pain Scale',
    unit: '/10',
    reference_range: { low: 0, high: 10, text: '0-10 scale' }
  },
  glucose: {
    type: 'glucose',
    display_name: 'Blood Glucose',
    unit: 'mg/dL',
    reference_range: { low: 70, high: 140, text: '70-140 mg/dL (fasting)' }
  }
};

export class ObservationService {
  
  // Record vital signs
  static async recordVital(vitalData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    type: Vital['type'];
    value_quantity?: number;
    value_string?: string;
    systolic?: number;
    diastolic?: number;
    unit?: string;
    measured_at?: string;
    performer_id: string;
    device_used?: string;
    method?: string;
    body_site?: string;
    notes?: string;
  }): Promise<Vital> {
    try {
      const template = VITAL_TEMPLATES[vitalData.type];
      const measuredAt = vitalData.measured_at || new Date().toISOString();
      
      // Calculate derived values
      let derivedData: any = {};
      
      // Auto-calculate BMI if height and weight are available
      if (vitalData.type === 'weight' && vitalData.value_quantity) {
        const heightVitals = await githubDB.find(collections.vitals, {
          patient_id: vitalData.patient_id,
          type: 'height'
        });
        
        if (heightVitals.length > 0) {
          const latestHeight = heightVitals[heightVitals.length - 1];
          if (latestHeight.value_quantity) {
            const heightInM = latestHeight.value_quantity / 100; // Convert cm to m
            const bmi = vitalData.value_quantity / (heightInM * heightInM);
            
            // Record BMI as a separate vital
            setTimeout(() => {
              this.recordVital({
                patient_id: vitalData.patient_id,
                encounter_id: vitalData.encounter_id,
                entity_id: vitalData.entity_id,
                type: 'bmi',
                value_quantity: Math.round(bmi * 10) / 10,
                measured_at: measuredAt,
                performer_id: vitalData.performer_id,
                notes: 'Auto-calculated from height and weight'
              });
            }, 100);
          }
        }
      }
      
      // Determine if abnormal
      const { isAbnormal, abnormalFlag } = this.assessAbnormalValue(
        vitalData.type,
        vitalData.value_quantity,
        vitalData.systolic,
        vitalData.diastolic
      );
      
      const vital = await githubDB.insert(collections.vitals, {
        ...vitalData,
        display_name: template?.display_name || vitalData.type.replace('_', ' '),
        unit: vitalData.unit || template?.unit,
        reference_range: template?.reference_range,
        is_abnormal: isAbnormal,
        abnormal_flag: abnormalFlag,
        measured_at: measuredAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Log critical values
      if (abnormalFlag && abnormalFlag.includes('critical')) {
        logger.warn('critical_vital_recorded', 'Critical vital sign recorded', {
          vital_id: vital.id,
          patient_id: vitalData.patient_id,
          type: vitalData.type,
          value: vitalData.value_quantity || `${vitalData.systolic}/${vitalData.diastolic}`,
          flag: abnormalFlag
        });
        
        // TODO: Integrate with notification service for critical values
      }
      
      await this.logAuditEvent('vital_recorded', vital.id, vitalData.performer_id);
      
      logger.info('vital_recorded', 'Vital sign recorded successfully', {
        vital_id: vital.id,
        patient_id: vitalData.patient_id,
        type: vitalData.type,
        is_abnormal: isAbnormal
      });
      
      return vital;
    } catch (error) {
      logger.error('vital_recording_failed', 'Failed to record vital sign', { error: error.message });
      throw error;
    }
  }
  
  // Get patient vitals
  static async getPatientVitals(patientId: string, type?: Vital['type'], limit?: number): Promise<Vital[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (type) filters.type = type;
      
      let vitals = await githubDB.find(collections.vitals, filters);
      
      // Sort by measured_at descending
      vitals.sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
      
      if (limit) vitals = vitals.slice(0, limit);
      
      return vitals;
    } catch (error) {
      logger.error('get_patient_vitals_failed', 'Failed to get patient vitals', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get encounter vitals
  static async getEncounterVitals(encounterId: string): Promise<Vital[]> {
    try {
      const vitals = await githubDB.find(collections.vitals, { encounter_id: encounterId });
      
      // Sort by measured_at ascending for encounter view
      vitals.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
      
      return vitals;
    } catch (error) {
      logger.error('get_encounter_vitals_failed', 'Failed to get encounter vitals', { 
        encounter_id: encounterId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get latest vitals summary for patient
  static async getLatestVitalsSummary(patientId: string): Promise<{ [key: string]: Vital }> {
    try {
      const vitals = await this.getPatientVitals(patientId);
      const summary: { [key: string]: Vital } = {};
      
      // Get the latest vital for each type
      vitals.forEach(vital => {
        if (!summary[vital.type] || new Date(vital.measured_at) > new Date(summary[vital.type].measured_at)) {
          summary[vital.type] = vital;
        }
      });
      
      return summary;
    } catch (error) {
      logger.error('get_vitals_summary_failed', 'Failed to get vitals summary', { 
        patient_id: patientId, 
        error: error.message 
      });
      return {};
    }
  }
  
  // Update vital sign
  static async updateVital(vitalId: string, updates: Partial<{
    value_quantity: number;
    value_string: string;
    systolic: number;
    diastolic: number;
    unit: string;
    device_used: string;
    method: string;
    body_site: string;
    notes: string;
  }>, updatedBy: string): Promise<Vital> {
    try {
      const vital = await githubDB.findById(collections.vitals, vitalId);
      if (!vital) throw new Error('Vital not found');
      
      // Re-assess abnormal status if values changed
      let assessmentUpdates = {};
      if (updates.value_quantity !== undefined || updates.systolic !== undefined || updates.diastolic !== undefined) {
        const { isAbnormal, abnormalFlag } = this.assessAbnormalValue(
          vital.type,
          updates.value_quantity ?? vital.value_quantity,
          updates.systolic ?? vital.systolic,
          updates.diastolic ?? vital.diastolic
        );
        assessmentUpdates = { is_abnormal: isAbnormal, abnormal_flag: abnormalFlag };
      }
      
      const updatedVital = await githubDB.update(collections.vitals, vitalId, {
        ...updates,
        ...assessmentUpdates,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('vital_updated', vitalId, updatedBy);
      
      return updatedVital;
    } catch (error) {
      logger.error('vital_update_failed', 'Failed to update vital', { 
        vital_id: vitalId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Delete vital sign
  static async deleteVital(vitalId: string, deletedBy: string): Promise<void> {
    try {
      await githubDB.delete(collections.vitals, vitalId);
      await this.logAuditEvent('vital_deleted', vitalId, deletedBy);
      
      logger.info('vital_deleted', 'Vital sign deleted', { vital_id: vitalId });
    } catch (error) {
      logger.error('vital_deletion_failed', 'Failed to delete vital', { 
        vital_id: vitalId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get vital trends for patient
  static async getVitalTrends(patientId: string, type: Vital['type'], days: number = 30): Promise<Vital[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const vitals = await this.getPatientVitals(patientId, type);
      
      return vitals.filter(vital => 
        new Date(vital.measured_at) >= startDate
      ).reverse(); // Chronological order for trends
    } catch (error) {
      logger.error('get_vital_trends_failed', 'Failed to get vital trends', { error: error.message });
      return [];
    }
  }
  
  // Assess if vital value is abnormal
  private static assessAbnormalValue(type: Vital['type'], quantity?: number, systolic?: number, diastolic?: number): {
    isAbnormal: boolean;
    abnormalFlag?: Vital['abnormal_flag'];
  } {
    const template = VITAL_TEMPLATES[type];
    if (!template?.reference_range) {
      return { isAbnormal: false };
    }
    
    // Special handling for blood pressure
    if (type === 'blood_pressure' && systolic !== undefined && diastolic !== undefined) {
      if (systolic >= 180 || diastolic >= 110) {
        return { isAbnormal: true, abnormalFlag: 'critical_high' };
      }
      if (systolic < 90 || diastolic < 60) {
        return { isAbnormal: true, abnormalFlag: 'critical_low' };
      }
      if (systolic > 140 || diastolic > 90) {
        return { isAbnormal: true, abnormalFlag: 'high' };
      }
      if (systolic < 100 || diastolic < 70) {
        return { isAbnormal: true, abnormalFlag: 'low' };
      }
      return { isAbnormal: false };
    }
    
    // For other numeric vitals
    if (quantity === undefined) {
      return { isAbnormal: false };
    }
    
    const { low, high } = template.reference_range;
    
    // Define critical thresholds (example values)
    const criticalThresholds: { [key: string]: { criticalLow?: number; criticalHigh?: number } } = {
      heart_rate: { criticalLow: 40, criticalHigh: 150 },
      respiratory_rate: { criticalLow: 8, criticalHigh: 30 },
      temperature: { criticalLow: 35, criticalHigh: 40 },
      oxygen_saturation: { criticalLow: 85, criticalHigh: undefined },
      glucose: { criticalLow: 50, criticalHigh: 400 }
    };
    
    const critical = criticalThresholds[type];
    
    if (critical?.criticalLow !== undefined && quantity <= critical.criticalLow) {
      return { isAbnormal: true, abnormalFlag: 'critical_low' };
    }
    
    if (critical?.criticalHigh !== undefined && quantity >= critical.criticalHigh) {
      return { isAbnormal: true, abnormalFlag: 'critical_high' };
    }
    
    if (low !== undefined && quantity < low) {
      return { isAbnormal: true, abnormalFlag: 'low' };
    }
    
    if (high !== undefined && quantity > high) {
      return { isAbnormal: true, abnormalFlag: 'high' };
    }
    
    return { isAbnormal: false };
  }
  
  // Get abnormal vitals for entity (for alerts)
  static async getAbnormalVitals(entityId: string, hours: number = 24): Promise<Vital[]> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);
      
      const vitals = await githubDB.find(collections.vitals, { 
        entity_id: entityId,
        is_abnormal: true 
      });
      
      return vitals.filter(vital => 
        new Date(vital.measured_at) >= startTime
      ).sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
    } catch (error) {
      logger.error('get_abnormal_vitals_failed', 'Failed to get abnormal vitals', { error: error.message });
      return [];
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, vitalId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'vital',
        resource_id: vitalId,
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