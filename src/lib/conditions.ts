// Condition Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';

// Condition Interface
export interface Condition {
  id: string;
  patient_id: string;
  encounter_id?: string;
  entity_id: string;
  
  // Clinical details
  condition_name: string;
  description?: string;
  category: 'problem_list' | 'diagnosis' | 'symptom' | 'complaint' | 'finding';
  
  // Coding (optional)
  code?: string; // ICD-10 or other coding system
  code_system?: string;
  code_display?: string;
  
  // Status and severity
  clinical_status: 'active' | 'inactive' | 'resolved' | 'remission' | 'relapse';
  verification_status: 'provisional' | 'differential' | 'confirmed' | 'refuted' | 'unknown';
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  
  // Timeline
  onset_date?: string;
  resolution_date?: string;
  last_occurrence?: string;
  
  // Additional details
  body_site?: string;
  stage?: string;
  evidence?: string;
  notes?: string;
  
  // Metadata
  recorded_by: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

// Common condition templates
export const CONDITION_TEMPLATES = {
  hypertension: {
    condition_name: 'Hypertension',
    code: 'I10',
    code_system: 'ICD-10',
    code_display: 'Essential (primary) hypertension',
    category: 'diagnosis'
  },
  diabetes_type_2: {
    condition_name: 'Type 2 Diabetes Mellitus',
    code: 'E11',
    code_system: 'ICD-10',
    code_display: 'Type 2 diabetes mellitus',
    category: 'diagnosis'
  },
  asthma: {
    condition_name: 'Asthma',
    code: 'J45',
    code_system: 'ICD-10',
    code_display: 'Asthma',
    category: 'diagnosis'
  },
  chest_pain: {
    condition_name: 'Chest Pain',
    code: 'R06.02',
    code_system: 'ICD-10',
    code_display: 'Shortness of breath',
    category: 'symptom'
  },
  headache: {
    condition_name: 'Headache',
    code: 'R51',
    code_system: 'ICD-10',
    code_display: 'Headache',
    category: 'symptom'
  },
  fever: {
    condition_name: 'Fever',
    code: 'R50.9',
    code_system: 'ICD-10',
    code_display: 'Fever, unspecified',
    category: 'symptom'
  }
};

export class ConditionService {
  
  // Add condition to patient
  static async addCondition(conditionData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    condition_name: string;
    description?: string;
    category: Condition['category'];
    code?: string;
    code_system?: string;
    code_display?: string;
    clinical_status: Condition['clinical_status'];
    verification_status: Condition['verification_status'];
    severity?: Condition['severity'];
    onset_date?: string;
    body_site?: string;
    stage?: string;
    evidence?: string;
    notes?: string;
    recorded_by: string;
  }): Promise<Condition> {
    try {
      const condition = await githubDB.insert(collections.conditions, {
        ...conditionData,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('condition_added', condition.id, conditionData.recorded_by);
      
      logger.info('condition_added', 'Condition added successfully', {
        condition_id: condition.id,
        patient_id: conditionData.patient_id,
        condition_name: conditionData.condition_name,
        category: conditionData.category
      });
      
      return condition;
    } catch (error) {
      logger.error('condition_add_failed', 'Failed to add condition', { error: error.message });
      throw error;
    }
  }
  
  // Update condition
  static async updateCondition(conditionId: string, updates: Partial<{
    condition_name: string;
    description: string;
    clinical_status: Condition['clinical_status'];
    verification_status: Condition['verification_status'];
    severity: Condition['severity'];
    onset_date: string;
    resolution_date: string;
    last_occurrence: string;
    body_site: string;
    stage: string;
    evidence: string;
    notes: string;
  }>, updatedBy: string): Promise<Condition> {
    try {
      const condition = await githubDB.update(collections.conditions, conditionId, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('condition_updated', conditionId, updatedBy);
      
      logger.info('condition_updated', 'Condition updated successfully', {
        condition_id: conditionId,
        updated_by: updatedBy
      });
      
      return condition;
    } catch (error) {
      logger.error('condition_update_failed', 'Failed to update condition', { 
        condition_id: conditionId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Resolve condition
  static async resolveCondition(conditionId: string, resolvedBy: string, resolutionDate?: string): Promise<Condition> {
    try {
      const condition = await githubDB.update(collections.conditions, conditionId, {
        clinical_status: 'resolved',
        resolution_date: resolutionDate || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('condition_resolved', conditionId, resolvedBy);
      
      logger.info('condition_resolved', 'Condition resolved', {
        condition_id: conditionId,
        resolved_by: resolvedBy
      });
      
      return condition;
    } catch (error) {
      logger.error('condition_resolve_failed', 'Failed to resolve condition', { 
        condition_id: conditionId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get patient conditions
  static async getPatientConditions(patientId: string, status?: Condition['clinical_status'], category?: Condition['category']): Promise<Condition[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (status) filters.clinical_status = status;
      if (category) filters.category = category;
      
      const conditions = await githubDB.find(collections.conditions, filters);
      
      // Sort by recorded_at descending
      conditions.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      
      return conditions;
    } catch (error) {
      logger.error('get_patient_conditions_failed', 'Failed to get patient conditions', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get encounter conditions
  static async getEncounterConditions(encounterId: string): Promise<Condition[]> {
    try {
      const conditions = await githubDB.find(collections.conditions, { encounter_id: encounterId });
      
      // Sort by recorded_at ascending for encounter view
      conditions.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      
      return conditions;
    } catch (error) {
      logger.error('get_encounter_conditions_failed', 'Failed to get encounter conditions', { 
        encounter_id: encounterId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get active problem list
  static async getActiveProblemList(patientId: string): Promise<Condition[]> {
    try {
      return await this.getPatientConditions(patientId, 'active', 'problem_list');
    } catch (error) {
      logger.error('get_problem_list_failed', 'Failed to get active problem list', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get diagnoses for encounter
  static async getEncounterDiagnoses(encounterId: string): Promise<Condition[]> {
    try {
      const conditions = await githubDB.find(collections.conditions, { 
        encounter_id: encounterId,
        category: 'diagnosis'
      });
      
      return conditions.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    } catch (error) {
      logger.error('get_encounter_diagnoses_failed', 'Failed to get encounter diagnoses', { 
        encounter_id: encounterId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Search conditions by name or code
  static async searchConditions(query: string, patientId?: string): Promise<Condition[]> {
    try {
      const filters: any = {};
      if (patientId) filters.patient_id = patientId;
      
      let conditions = await githubDB.find(collections.conditions, filters);
      
      // Filter by query
      if (query) {
        const lowerQuery = query.toLowerCase();
        conditions = conditions.filter(condition => 
          condition.condition_name.toLowerCase().includes(lowerQuery) ||
          condition.description?.toLowerCase().includes(lowerQuery) ||
          condition.code?.toLowerCase().includes(lowerQuery) ||
          condition.code_display?.toLowerCase().includes(lowerQuery)
        );
      }
      
      return conditions.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    } catch (error) {
      logger.error('search_conditions_failed', 'Failed to search conditions', { error: error.message });
      return [];
    }
  }
  
  // Get condition statistics for entity
  static async getConditionStats(entityId: string, startDate: string, endDate: string): Promise<{
    total: number;
    by_category: { [key: string]: number };
    by_status: { [key: string]: number };
    most_common: Array<{ condition_name: string; count: number }>;
  }> {
    try {
      let conditions = await githubDB.find(collections.conditions, { entity_id: entityId });
      
      // Filter by date range
      conditions = conditions.filter(condition => {
        const recordedDate = condition.recorded_at;
        return recordedDate >= startDate && recordedDate <= endDate;
      });
      
      const stats = {
        total: conditions.length,
        by_category: {} as { [key: string]: number },
        by_status: {} as { [key: string]: number },
        most_common: [] as Array<{ condition_name: string; count: number }>
      };
      
      const conditionCounts: { [key: string]: number } = {};
      
      conditions.forEach(condition => {
        // Count by category
        stats.by_category[condition.category] = (stats.by_category[condition.category] || 0) + 1;
        
        // Count by status
        stats.by_status[condition.clinical_status] = (stats.by_status[condition.clinical_status] || 0) + 1;
        
        // Count condition names
        conditionCounts[condition.condition_name] = (conditionCounts[condition.condition_name] || 0) + 1;
      });
      
      // Get most common conditions
      stats.most_common = Object.entries(conditionCounts)
        .map(([condition_name, count]) => ({ condition_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return stats;
    } catch (error) {
      logger.error('get_condition_stats_failed', 'Failed to get condition statistics', { error: error.message });
      return {
        total: 0,
        by_category: {},
        by_status: {},
        most_common: []
      };
    }
  }
  
  // Add condition from template
  static async addConditionFromTemplate(templateKey: keyof typeof CONDITION_TEMPLATES, additionalData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    clinical_status: Condition['clinical_status'];
    verification_status: Condition['verification_status'];
    severity?: Condition['severity'];
    onset_date?: string;
    notes?: string;
    recorded_by: string;
  }): Promise<Condition> {
    try {
      const template = CONDITION_TEMPLATES[templateKey];
      if (!template) {
        throw new Error(`Unknown condition template: ${templateKey}`);
      }
      
      return await this.addCondition({
        ...template,
        ...additionalData
      });
    } catch (error) {
      logger.error('add_condition_from_template_failed', 'Failed to add condition from template', { 
        template: templateKey, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Delete condition
  static async deleteCondition(conditionId: string, deletedBy: string): Promise<void> {
    try {
      await githubDB.delete(collections.conditions, conditionId);
      await this.logAuditEvent('condition_deleted', conditionId, deletedBy);
      
      logger.info('condition_deleted', 'Condition deleted', { condition_id: conditionId });
    } catch (error) {
      logger.error('condition_deletion_failed', 'Failed to delete condition', { 
        condition_id: conditionId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get condition history (all changes)
  static async getConditionHistory(conditionId: string): Promise<any[]> {
    try {
      const auditLogs = await githubDB.find(collections.audit_logs, {
        resource_type: 'condition',
        resource_id: conditionId
      });
      
      return auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      logger.error('get_condition_history_failed', 'Failed to get condition history', { 
        condition_id: conditionId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get related conditions (conditions that often occur together)
  static async getRelatedConditions(conditionName: string, entityId: string): Promise<Array<{ condition_name: string; frequency: number }>> {
    try {
      // Get all patients with this condition at this entity
      const conditions = await githubDB.find(collections.conditions, {
        entity_id: entityId,
        condition_name: conditionName
      });
      
      const patientIds = [...new Set(conditions.map(c => c.patient_id))];
      
      if (patientIds.length === 0) return [];
      
      // Get all other conditions for these patients
      const allConditions = await githubDB.find(collections.conditions, { entity_id: entityId });
      const relatedConditions = allConditions.filter(c => 
        patientIds.includes(c.patient_id) && c.condition_name !== conditionName
      );
      
      // Count frequencies
      const conditionCounts: { [key: string]: number } = {};
      relatedConditions.forEach(condition => {
        conditionCounts[condition.condition_name] = (conditionCounts[condition.condition_name] || 0) + 1;
      });
      
      // Calculate frequencies as percentages
      return Object.entries(conditionCounts)
        .map(([condition_name, count]) => ({
          condition_name,
          frequency: Math.round((count / patientIds.length) * 100)
        }))
        .filter(item => item.frequency >= 10) // Only show if occurs in 10%+ of patients
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);
    } catch (error) {
      logger.error('get_related_conditions_failed', 'Failed to get related conditions', { error: error.message });
      return [];
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, conditionId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'condition',
        resource_id: conditionId,
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