// Imaging Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { EmailNotificationService } from './email-notifications';

// Imaging Order Interface
export interface ImagingOrder {
  id: string;
  patient_id: string;
  encounter_id?: string;
  entity_id: string;
  imaging_entity_id?: string;
  orderer_id: string;
  
  // Order details
  order_number: string;
  status: 'draft' | 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'entered_in_error';
  priority: 'routine' | 'urgent' | 'asap' | 'stat';
  modality: 'x_ray' | 'ct' | 'mri' | 'ultrasound' | 'mammography' | 'nuclear' | 'fluoroscopy' | 'other';
  
  // Study details
  study_description: string;
  body_part: string;
  laterality?: 'left' | 'right' | 'bilateral';
  contrast_required: boolean;
  contrast_type?: string;
  
  // Scheduling
  ordered_at: string;
  scheduled_date?: string;
  scheduled_time?: string;
  estimated_duration?: number;
  
  // Clinical info
  clinical_info: string;
  diagnosis_codes?: string[];
  reason_for_study: string;
  relevant_history?: string;
  
  // Special instructions
  preparation_instructions?: string;
  special_instructions?: string;
  
  // Notes
  notes?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Imaging Report Interface
export interface ImagingReport {
  id: string;
  imaging_order_id: string;
  patient_id: string;
  
  // Study details
  study_date: string;
  study_time: string;
  modality: string;
  study_description: string;
  
  // Technical details
  technique?: string;
  contrast_used?: boolean;
  contrast_amount?: string;
  
  // Findings
  findings: string;
  impression: string;
  recommendations?: string;
  
  // Images
  image_count: number;
  image_urls?: string[];
  dicom_study_uid?: string;
  
  // Reporting
  reported_by: string;
  reported_at: string;
  preliminary: boolean;
  
  // Review process
  reviewed_by?: string;
  reviewed_at?: string;
  final_report: boolean;
  
  // Patient release
  released_to_patient: boolean;
  released_at?: string;
  released_by?: string;
  
  // Additional info
  critical_finding: boolean;
  follow_up_required: boolean;
  follow_up_timeframe?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// Common imaging templates
export const IMAGING_TEMPLATES = {
  chest_xray: {
    modality: 'x_ray',
    study_description: 'Chest X-Ray',
    body_part: 'Chest',
    contrast_required: false,
    estimated_duration: 15,
    preparation_instructions: 'Remove metal objects and jewelry from chest area'
  },
  abdominal_ct: {
    modality: 'ct',
    study_description: 'CT Abdomen and Pelvis',
    body_part: 'Abdomen/Pelvis',
    contrast_required: true,
    contrast_type: 'IV contrast',
    estimated_duration: 30,
    preparation_instructions: 'NPO 4 hours prior. Arrive 1 hour early for contrast prep.'
  },
  brain_mri: {
    modality: 'mri',
    study_description: 'MRI Brain',
    body_part: 'Brain',
    contrast_required: false,
    estimated_duration: 45,
    preparation_instructions: 'Remove all metal objects. Inform if you have any implants.'
  },
  ultrasound_abdomen: {
    modality: 'ultrasound',
    study_description: 'Abdominal Ultrasound',
    body_part: 'Abdomen',
    contrast_required: false,
    estimated_duration: 30,
    preparation_instructions: 'NPO 8 hours prior to exam'
  }
};

export class ImagingService {
  
  // Create imaging order
  static async createImagingOrder(orderData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    imaging_entity_id?: string;
    orderer_id: string;
    priority: ImagingOrder['priority'];
    modality: ImagingOrder['modality'];
    study_description: string;
    body_part: string;
    laterality?: ImagingOrder['laterality'];
    contrast_required: boolean;
    contrast_type?: string;
    clinical_info: string;
    reason_for_study: string;
    relevant_history?: string;
    preparation_instructions?: string;
    special_instructions?: string;
    estimated_duration?: number;
    notes?: string;
  }): Promise<ImagingOrder> {
    try {
      const orderNumber = await this.generateOrderNumber();
      
      const imagingOrder = await githubDB.insert(collections.imaging_orders, {
        ...orderData,
        order_number: orderNumber,
        status: 'requested',
        ordered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Notify imaging department if external
      if (orderData.imaging_entity_id && orderData.imaging_entity_id !== orderData.entity_id) {
        await this.notifyImagingDepartment(imagingOrder.id, orderData.imaging_entity_id);
      }
      
      await this.logAuditEvent('imaging_order_created', imagingOrder.id, orderData.orderer_id);
      
      logger.info('imaging_order_created', 'Imaging order created successfully', {
        order_id: imagingOrder.id,
        order_number: orderNumber,
        patient_id: orderData.patient_id,
        modality: orderData.modality
      });
      
      return imagingOrder;
    } catch (error) {
      logger.error('imaging_order_creation_failed', 'Failed to create imaging order', { error: error.message });
      throw error;
    }
  }
  
  // Update imaging order status
  static async updateImagingOrderStatus(orderId: string, status: ImagingOrder['status'], updatedBy: string, notes?: string): Promise<ImagingOrder> {
    try {
      const updates: any = {
        status: status,
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        updates.notes = notes;
      }
      
      const order = await githubDB.update(collections.imaging_orders, orderId, updates);
      
      await this.logAuditEvent('imaging_order_status_updated', orderId, updatedBy, {
        new_status: status,
        notes: notes
      });
      
      return order;
    } catch (error) {
      logger.error('imaging_order_status_update_failed', 'Failed to update imaging order status', { 
        order_id: orderId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Schedule imaging study
  static async scheduleImagingStudy(orderId: string, scheduledDate: string, scheduledTime: string, scheduledBy: string): Promise<ImagingOrder> {
    try {
      const order = await githubDB.update(collections.imaging_orders, orderId, {
        status: 'scheduled',
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        updated_at: new Date().toISOString()
      });
      
      // Notify patient of appointment
      await this.notifyPatientAppointmentScheduled(orderId);
      
      await this.logAuditEvent('imaging_study_scheduled', orderId, scheduledBy);
      
      return order;
    } catch (error) {
      logger.error('imaging_study_schedule_failed', 'Failed to schedule imaging study', { 
        order_id: orderId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Create imaging report
  static async createImagingReport(reportData: {
    imaging_order_id: string;
    patient_id: string;
    study_date: string;
    study_time: string;
    modality: string;
    study_description: string;
    technique?: string;
    contrast_used?: boolean;
    contrast_amount?: string;
    findings: string;
    impression: string;
    recommendations?: string;
    image_count: number;
    image_urls?: string[];
    reported_by: string;
    preliminary: boolean;
    critical_finding: boolean;
    follow_up_required: boolean;
    follow_up_timeframe?: string;
  }): Promise<ImagingReport> {
    try {
      const report = await githubDB.insert(collections.documents, {
        ...reportData,
        reported_at: new Date().toISOString(),
        final_report: !reportData.preliminary,
        released_to_patient: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Update order status
      await this.updateImagingOrderStatus(reportData.imaging_order_id, 'completed', reportData.reported_by);
      
      // Handle critical findings
      if (reportData.critical_finding) {
        await this.handleCriticalFinding(report.id);
      }
      
      await this.logAuditEvent('imaging_report_created', report.id, reportData.reported_by);
      
      logger.info('imaging_report_created', 'Imaging report created successfully', {
        report_id: report.id,
        order_id: reportData.imaging_order_id,
        modality: reportData.modality,
        critical_finding: reportData.critical_finding
      });
      
      return report;
    } catch (error) {
      logger.error('imaging_report_creation_failed', 'Failed to create imaging report', { error: error.message });
      throw error;
    }
  }
  
  // Generate order number
  private static async generateOrderNumber(): Promise<string> {
    const prefix = 'IMG';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Notify imaging department
  private static async notifyImagingDepartment(orderId: string, imagingEntityId: string): Promise<void> {
    try {
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: imagingEntityId,
        type: 'new_imaging_order',
        title: 'New Imaging Order Received',
        message: `New imaging order ${orderId} requires scheduling`,
        data: { imaging_order_id: orderId },
        is_read: false,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('notify_imaging_department_failed', 'Failed to notify imaging department', { error: error.message });
    }
  }
  
  // Handle critical findings
  private static async handleCriticalFinding(reportId: string): Promise<void> {
    try {
      const report = await githubDB.findById(collections.documents, reportId);
      if (!report) return;
      
      const order = await githubDB.findById(collections.imaging_orders, report.imaging_order_id);
      if (!order) return;
      
      // Create high-priority notification
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: order.entity_id,
        type: 'critical_imaging_finding',
        title: 'Critical Imaging Finding',
        message: `Critical finding in ${report.study_description} requires immediate attention`,
        data: { 
          report_id: reportId,
          order_id: order.id,
          patient_id: report.patient_id 
        },
        priority: 'high',
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      logger.warn('critical_imaging_finding', 'Critical imaging finding detected', {
        report_id: reportId,
        study_description: report.study_description,
        patient_id: report.patient_id
      });
      
    } catch (error) {
      logger.error('handle_critical_finding_failed', 'Failed to handle critical finding', { error: error.message });
    }
  }
  
  // Notify patient appointment scheduled
  private static async notifyPatientAppointmentScheduled(orderId: string): Promise<void> {
    try {
      const order = await githubDB.findById(collections.imaging_orders, orderId);
      if (!order) return;
      
      await githubDB.insert(collections.notifications, {
        recipient_type: 'patient',
        recipient_id: order.patient_id,
        type: 'imaging_appointment_scheduled',
        title: 'Imaging Appointment Scheduled',
        message: `Your ${order.study_description} is scheduled for ${order.scheduled_date} at ${order.scheduled_time}`,
        data: { order_id: orderId },
        is_read: false,
        created_at: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('notify_patient_appointment_scheduled_failed', 'Failed to notify patient', { error: error.message });
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, resourceId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'imaging',
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