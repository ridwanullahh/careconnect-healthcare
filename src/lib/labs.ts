// Lab Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { EmailNotificationService } from './email-notifications';

// Lab Order Interface
export interface LabOrder {
  id: string;
  patient_id: string;
  encounter_id?: string;
  entity_id: string;
  lab_entity_id?: string; // External lab if different from ordering entity
  orderer_id: string;
  
  // Order details
  order_number: string;
  status: 'draft' | 'requested' | 'received' | 'in_progress' | 'completed' | 'cancelled' | 'entered_in_error';
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  category: 'chemistry' | 'hematology' | 'microbiology' | 'pathology' | 'immunology' | 'molecular' | 'other';
  
  // Tests requested
  tests: Array<{
    test_code?: string;
    test_name: string;
    specimen_type: string; // blood, urine, stool, etc.
    panel?: string;
    fasting_required?: boolean;
    special_instructions?: string;
  }>;
  
  // Specimen details
  specimen_collected: boolean;
  collection_date?: string;
  collection_time?: string;
  collected_by?: string;
  collection_method?: string;
  collection_site?: string;
  
  // Timing
  ordered_at: string;
  expected_completion?: string;
  
  // Clinical info
  clinical_info?: string;
  diagnosis_codes?: string[];
  reason_for_test: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Lab Result Interface
export interface LabResult {
  id: string;
  lab_order_id: string;
  patient_id: string;
  
  // Result details
  test_name: string;
  test_code?: string;
  
  // Results
  analytes: Array<{
    analyte_name: string;
    analyte_code?: string;
    value: string;
    numeric_value?: number;
    unit?: string;
    reference_range?: string;
    reference_low?: number;
    reference_high?: number;
    abnormal_flag?: 'low' | 'high' | 'critical_low' | 'critical_high' | 'abnormal';
    status: 'preliminary' | 'final' | 'corrected' | 'amended';
  }>;
  
  // Status and timing
  status: 'preliminary' | 'final' | 'corrected' | 'amended' | 'cancelled';
  resulted_at: string;
  resulted_by: string;
  verified_at?: string;
  verified_by?: string;
  
  // Release info
  released_to_patient: boolean;
  released_at?: string;
  released_by?: string;
  
  // Additional info
  specimen_info?: {
    specimen_id?: string;
    collection_date?: string;
    received_date?: string;
    condition?: string;
  };
  
  method?: string;
  instrument?: string;
  lab_comments?: string;
  critical_value: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Common lab test templates
export const LAB_TEST_TEMPLATES = {
  cbc: {
    test_name: 'Complete Blood Count',
    test_code: 'CBC',
    panel: 'Hematology Panel',
    specimen_type: 'blood',
    category: 'hematology',
    analytes: [
      { name: 'WBC', unit: 'K/uL', ref_low: 4.5, ref_high: 11.0 },
      { name: 'RBC', unit: 'M/uL', ref_low: 4.2, ref_high: 5.4 },
      { name: 'Hemoglobin', unit: 'g/dL', ref_low: 12.0, ref_high: 15.5 },
      { name: 'Hematocrit', unit: '%', ref_low: 36, ref_high: 46 },
      { name: 'Platelets', unit: 'K/uL', ref_low: 150, ref_high: 450 }
    ]
  },
  bmp: {
    test_name: 'Basic Metabolic Panel',
    test_code: 'BMP',
    panel: 'Chemistry Panel',
    specimen_type: 'blood',
    category: 'chemistry',
    fasting_required: true,
    analytes: [
      { name: 'Glucose', unit: 'mg/dL', ref_low: 70, ref_high: 99 },
      { name: 'BUN', unit: 'mg/dL', ref_low: 7, ref_high: 20 },
      { name: 'Creatinine', unit: 'mg/dL', ref_low: 0.7, ref_high: 1.3 },
      { name: 'Sodium', unit: 'mmol/L', ref_low: 136, ref_high: 145 },
      { name: 'Potassium', unit: 'mmol/L', ref_low: 3.5, ref_high: 5.1 },
      { name: 'Chloride', unit: 'mmol/L', ref_low: 98, ref_high: 107 },
      { name: 'CO2', unit: 'mmol/L', ref_low: 22, ref_high: 29 }
    ]
  },
  lipid_panel: {
    test_name: 'Lipid Panel',
    test_code: 'LIPID',
    panel: 'Lipid Panel',
    specimen_type: 'blood',
    category: 'chemistry',
    fasting_required: true,
    analytes: [
      { name: 'Total Cholesterol', unit: 'mg/dL', ref_low: 0, ref_high: 200 },
      { name: 'LDL Cholesterol', unit: 'mg/dL', ref_low: 0, ref_high: 100 },
      { name: 'HDL Cholesterol', unit: 'mg/dL', ref_low: 40, ref_high: 999 },
      { name: 'Triglycerides', unit: 'mg/dL', ref_low: 0, ref_high: 150 }
    ]
  },
  tsh: {
    test_name: 'Thyroid Stimulating Hormone',
    test_code: 'TSH',
    specimen_type: 'blood',
    category: 'immunology',
    analytes: [
      { name: 'TSH', unit: 'mIU/L', ref_low: 0.4, ref_high: 4.0 }
    ]
  },
  urinalysis: {
    test_name: 'Urinalysis',
    test_code: 'UA',
    specimen_type: 'urine',
    category: 'chemistry',
    analytes: [
      { name: 'Color', unit: '', ref_range: 'Yellow' },
      { name: 'Clarity', unit: '', ref_range: 'Clear' },
      { name: 'Specific Gravity', unit: '', ref_low: 1.003, ref_high: 1.030 },
      { name: 'pH', unit: '', ref_low: 5.0, ref_high: 8.0 },
      { name: 'Protein', unit: '', ref_range: 'Negative' },
      { name: 'Glucose', unit: '', ref_range: 'Negative' },
      { name: 'Ketones', unit: '', ref_range: 'Negative' },
      { name: 'Blood', unit: '', ref_range: 'Negative' }
    ]
  }
};

export class LabService {
  
  // Create lab order
  static async createLabOrder(orderData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    lab_entity_id?: string;
    orderer_id: string;
    priority: LabOrder['priority'];
    category: LabOrder['category'];
    tests: LabOrder['tests'];
    reason_for_test: string;
    clinical_info?: string;
    diagnosis_codes?: string[];
    expected_completion?: string;
    notes?: string;
  }): Promise<LabOrder> {
    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();
      
      const labOrder = await githubDB.insert(collections.lab_orders, {
        ...orderData,
        order_number: orderNumber,
        status: 'requested',
        specimen_collected: false,
        ordered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Notify lab if external
      if (orderData.lab_entity_id && orderData.lab_entity_id !== orderData.entity_id) {
        await this.notifyLab(labOrder.id, orderData.lab_entity_id);
      }
      
      await this.logAuditEvent('lab_order_created', labOrder.id, orderData.orderer_id);
      
      logger.info('lab_order_created', 'Lab order created successfully', {
        order_id: labOrder.id,
        order_number: orderNumber,
        patient_id: orderData.patient_id,
        test_count: orderData.tests.length
      });
      
      return labOrder;
    } catch (error) {
      logger.error('lab_order_creation_failed', 'Failed to create lab order', { error: error.message });
      throw error;
    }
  }
  
  // Update lab order status
  static async updateLabOrderStatus(orderId: string, status: LabOrder['status'], updatedBy: string, notes?: string): Promise<LabOrder> {
    try {
      const updates: any = {
        status: status,
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        updates.notes = notes;
      }
      
      const order = await githubDB.update(collections.lab_orders, orderId, updates);
      
      await this.logAuditEvent('lab_order_status_updated', orderId, updatedBy, {
        new_status: status,
        notes: notes
      });
      
      logger.info('lab_order_status_updated', 'Lab order status updated', {
        order_id: orderId,
        new_status: status
      });
      
      return order;
    } catch (error) {
      logger.error('lab_order_status_update_failed', 'Failed to update lab order status', { 
        order_id: orderId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Record specimen collection
  static async recordSpecimenCollection(orderId: string, collectionData: {
    collected_by: string;
    collection_date?: string;
    collection_time?: string;
    collection_method?: string;
    collection_site?: string;
    notes?: string;
  }): Promise<LabOrder> {
    try {
      const order = await githubDB.update(collections.lab_orders, orderId, {
        specimen_collected: true,
        collection_date: collectionData.collection_date || new Date().toISOString(),
        collection_time: collectionData.collection_time || new Date().toTimeString(),
        collected_by: collectionData.collected_by,
        collection_method: collectionData.collection_method,
        collection_site: collectionData.collection_site,
        status: 'received',
        notes: collectionData.notes,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('specimen_collected', orderId, collectionData.collected_by);
      
      return order;
    } catch (error) {
      logger.error('specimen_collection_failed', 'Failed to record specimen collection', { 
        order_id: orderId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Add lab results
  static async addLabResults(resultData: {
    lab_order_id: string;
    patient_id: string;
    test_name: string;
    test_code?: string;
    analytes: LabResult['analytes'];
    status: LabResult['status'];
    resulted_by: string;
    method?: string;
    instrument?: string;
    lab_comments?: string;
    specimen_info?: LabResult['specimen_info'];
  }): Promise<LabResult> {
    try {
      // Check for critical values
      const hasCriticalValues = resultData.analytes.some(analyte => 
        analyte.abnormal_flag === 'critical_low' || analyte.abnormal_flag === 'critical_high'
      );
      
      const labResult = await githubDB.insert(collections.lab_results, {
        ...resultData,
        critical_value: hasCriticalValues,
        released_to_patient: false,
        resulted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Update order status
      await this.updateLabOrderStatus(resultData.lab_order_id, 'completed', resultData.resulted_by);
      
      // Handle critical values
      if (hasCriticalValues) {
        await this.handleCriticalValues(labResult.id);
      }
      
      await this.logAuditEvent('lab_results_added', labResult.id, resultData.resulted_by);
      
      logger.info('lab_results_added', 'Lab results added successfully', {
        result_id: labResult.id,
        order_id: resultData.lab_order_id,
        test_name: resultData.test_name,
        critical_value: hasCriticalValues
      });
      
      return labResult;
    } catch (error) {
      logger.error('lab_results_add_failed', 'Failed to add lab results', { error: error.message });
      throw error;
    }
  }
  
  // Release results to patient
  static async releaseResultsToPatient(resultId: string, releasedBy: string): Promise<LabResult> {
    try {
      const result = await githubDB.update(collections.lab_results, resultId, {
        released_to_patient: true,
        released_at: new Date().toISOString(),
        released_by: releasedBy,
        updated_at: new Date().toISOString()
      });
      
      // Notify patient
      await this.notifyPatientResultsReady(resultId);
      
      await this.logAuditEvent('lab_results_released', resultId, releasedBy);
      
      return result;
    } catch (error) {
      logger.error('lab_results_release_failed', 'Failed to release lab results', { 
        result_id: resultId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get patient lab orders
  static async getPatientLabOrders(patientId: string, status?: LabOrder['status']): Promise<LabOrder[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (status) filters.status = status;
      
      const orders = await githubDB.find(collections.lab_orders, filters);
      
      return orders.sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime());
    } catch (error) {
      logger.error('get_patient_lab_orders_failed', 'Failed to get patient lab orders', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get entity lab orders
  static async getEntityLabOrders(entityId: string, status?: LabOrder['status'], category?: LabOrder['category']): Promise<LabOrder[]> {
    try {
      const filters: any = { entity_id: entityId };
      if (status) filters.status = status;
      if (category) filters.category = category;
      
      const orders = await githubDB.find(collections.lab_orders, filters);
      
      return orders.sort((a, b) => new Date(b.ordered_at).getTime() - new Date(a.ordered_at).getTime());
    } catch (error) {
      logger.error('get_entity_lab_orders_failed', 'Failed to get entity lab orders', { 
        entity_id: entityId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get lab results for order
  static async getLabResults(labOrderId: string): Promise<LabResult[]> {
    try {
      const results = await githubDB.find(collections.lab_results, { lab_order_id: labOrderId });
      
      return results.sort((a, b) => new Date(b.resulted_at).getTime() - new Date(a.resulted_at).getTime());
    } catch (error) {
      logger.error('get_lab_results_failed', 'Failed to get lab results', { 
        order_id: labOrderId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get patient lab results
  static async getPatientLabResults(patientId: string, releasedOnly: boolean = true): Promise<LabResult[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (releasedOnly) filters.released_to_patient = true;
      
      const results = await githubDB.find(collections.lab_results, filters);
      
      return results.sort((a, b) => new Date(b.resulted_at).getTime() - new Date(a.resulted_at).getTime());
    } catch (error) {
      logger.error('get_patient_lab_results_failed', 'Failed to get patient lab results', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Create order from template
  static async createOrderFromTemplate(templateKey: keyof typeof LAB_TEST_TEMPLATES, orderData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    orderer_id: string;
    priority: LabOrder['priority'];
    reason_for_test: string;
    clinical_info?: string;
    notes?: string;
  }): Promise<LabOrder> {
    try {
      const template = LAB_TEST_TEMPLATES[templateKey];
      if (!template) {
        throw new Error(`Unknown lab test template: ${templateKey}`);
      }
      
      const tests: LabOrder['tests'] = [{
        test_code: template.test_code,
        test_name: template.test_name,
        specimen_type: template.specimen_type,
        panel: template.panel,
        fasting_required: template.fasting_required,
        special_instructions: template.fasting_required ? 'Fasting required (8-12 hours)' : undefined
      }];
      
      return await this.createLabOrder({
        ...orderData,
        category: template.category as LabOrder['category'],
        tests: tests
      });
    } catch (error) {
      logger.error('create_order_from_template_failed', 'Failed to create order from template', { 
        template: templateKey, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get pending specimen collections
  static async getPendingSpecimenCollections(entityId: string): Promise<LabOrder[]> {
    try {
      const orders = await githubDB.find(collections.lab_orders, {
        entity_id: entityId,
        status: 'requested',
        specimen_collected: false
      });
      
      return orders.sort((a, b) => {
        // Sort by priority first, then by order date
        const priorityOrder = { 'stat': 1, 'asap': 2, 'urgent': 3, 'routine': 4 };
        const aPriority = priorityOrder[a.priority] || 5;
        const bPriority = priorityOrder[b.priority] || 5;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return new Date(a.ordered_at).getTime() - new Date(b.ordered_at).getTime();
      });
    } catch (error) {
      logger.error('get_pending_specimen_collections_failed', 'Failed to get pending specimen collections', { error: error.message });
      return [];
    }
  }
  
  // Get critical results pending review
  static async getCriticalResults(entityId: string): Promise<LabResult[]> {
    try {
      const results = await githubDB.find(collections.lab_results, {
        critical_value: true,
        released_to_patient: false
      });
      
      // Filter by entity (need to join with lab_orders)
      const entityResults = [];
      for (const result of results) {
        const order = await githubDB.findById(collections.lab_orders, result.lab_order_id);
        if (order && order.entity_id === entityId) {
          entityResults.push(result);
        }
      }
      
      return entityResults.sort((a, b) => new Date(a.resulted_at).getTime() - new Date(b.resulted_at).getTime());
    } catch (error) {
      logger.error('get_critical_results_failed', 'Failed to get critical results', { error: error.message });
      return [];
    }
  }
  
  // Handle critical values
  private static async handleCriticalValues(resultId: string): Promise<void> {
    try {
      const result = await githubDB.findById(collections.lab_results, resultId);
      if (!result) return;
      
      const order = await githubDB.findById(collections.lab_orders, result.lab_order_id);
      if (!order) return;
      
      // Create high-priority notification
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: order.entity_id,
        type: 'critical_lab_result',
        title: 'Critical Lab Result',
        message: `Critical values detected in ${result.test_name} for patient`,
        data: { 
          result_id: resultId,
          order_id: order.id,
          patient_id: result.patient_id 
        },
        priority: 'high',
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      logger.warn('critical_lab_result', 'Critical lab result detected', {
        result_id: resultId,
        test_name: result.test_name,
        patient_id: result.patient_id
      });
      
    } catch (error) {
      logger.error('handle_critical_values_failed', 'Failed to handle critical values', { error: error.message });
    }
  }
  
  // Generate order number
  private static async generateOrderNumber(): Promise<string> {
    const prefix = 'LAB';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Notify lab of new order
  private static async notifyLab(orderId: string, labEntityId: string): Promise<void> {
    try {
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: labEntityId,
        type: 'new_lab_order',
        title: 'New Lab Order Received',
        message: `New lab order ${orderId} requires processing`,
        data: { lab_order_id: orderId },
        is_read: false,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('notify_lab_failed', 'Failed to notify lab', { error: error.message });
    }
  }
  
  // Notify patient results are ready
  private static async notifyPatientResultsReady(resultId: string): Promise<void> {
    try {
      const result = await githubDB.findById(collections.lab_results, resultId);
      if (!result) return;
      
      await githubDB.insert(collections.notifications, {
        recipient_type: 'patient',
        recipient_id: result.patient_id,
        type: 'lab_results_ready',
        title: 'Lab Results Available',
        message: `Your ${result.test_name} results are now available`,
        data: { result_id: resultId },
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      // Send email notification
      await EmailNotificationService.sendNotification({
        type: 'lab_results_ready',
        recipient: `patient-${result.patient_id}@placeholder.com`,
        data: { resultId: resultId, testName: result.test_name }
      });
      
    } catch (error) {
      logger.error('notify_patient_results_ready_failed', 'Failed to notify patient', { error: error.message });
    }
  }
  
  // Get lab statistics
  static async getLabStats(entityId: string, startDate: string, endDate: string): Promise<{
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    average_turnaround_time: number;
    by_category: { [key: string]: number };
    by_priority: { [key: string]: number };
    critical_results: number;
  }> {
    try {
      let orders = await githubDB.find(collections.lab_orders, { entity_id: entityId });
      
      // Filter by date range
      orders = orders.filter(order => {
        const orderDate = order.ordered_at;
        return orderDate >= startDate && orderDate <= endDate;
      });
      
      const stats = {
        total_orders: orders.length,
        completed_orders: 0,
        pending_orders: 0,
        average_turnaround_time: 0,
        by_category: {} as { [key: string]: number },
        by_priority: {} as { [key: string]: number },
        critical_results: 0
      };
      
      let totalTurnaroundTime = 0;
      let completedWithTimes = 0;
      
      for (const order of orders) {
        // Count by status
        if (order.status === 'completed') {
          stats.completed_orders++;
          
          // Calculate turnaround time if we have both dates
          if (order.collection_date) {
            const results = await this.getLabResults(order.id);
            if (results.length > 0) {
              const collectionTime = new Date(order.collection_date).getTime();
              const resultTime = new Date(results[0].resulted_at).getTime();
              const turnaroundHours = (resultTime - collectionTime) / (1000 * 60 * 60);
              totalTurnaroundTime += turnaroundHours;
              completedWithTimes++;
            }
          }
        } else if (!['cancelled', 'entered_in_error'].includes(order.status)) {
          stats.pending_orders++;
        }
        
        // Count by category
        stats.by_category[order.category] = (stats.by_category[order.category] || 0) + 1;
        
        // Count by priority
        stats.by_priority[order.priority] = (stats.by_priority[order.priority] || 0) + 1;
      }
      
      // Calculate average turnaround time in hours
      stats.average_turnaround_time = completedWithTimes > 0 ? totalTurnaroundTime / completedWithTimes : 0;
      
      // Count critical results
      const results = await githubDB.find(collections.lab_results, { critical_value: true });
      const criticalResults = [];
      for (const result of results) {
        const order = await githubDB.findById(collections.lab_orders, result.lab_order_id);
        if (order && order.entity_id === entityId && 
            order.ordered_at >= startDate && order.ordered_at <= endDate) {
          criticalResults.push(result);
        }
      }
      stats.critical_results = criticalResults.length;
      
      return stats;
    } catch (error) {
      logger.error('get_lab_stats_failed', 'Failed to get lab statistics', { error: error.message });
      return {
        total_orders: 0,
        completed_orders: 0,
        pending_orders: 0,
        average_turnaround_time: 0,
        by_category: {},
        by_priority: {},
        critical_results: 0
      };
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, resourceId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'lab',
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