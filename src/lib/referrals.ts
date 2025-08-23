// Referral Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';
import { EmailNotificationService } from './email-notifications';

// Referral Interface
export interface Referral {
  id: string;
  patient_id: string;
  encounter_id?: string;
  
  // Referral flow
  from_entity_id: string;
  to_entity_id: string;
  referring_provider_id: string;
  
  // Referral details
  referral_number: string;
  type: 'consultation' | 'treatment' | 'procedure' | 'second_opinion' | 'emergency' | 'follow_up';
  priority: 'routine' | 'urgent' | 'emergency';
  specialty_required?: string;
  
  // Clinical information
  reason_for_referral: string;
  clinical_summary: string;
  relevant_history?: string;
  current_medications?: string;
  allergies?: string;
  
  // Diagnosis and codes
  primary_diagnosis?: string;
  diagnosis_codes?: string[];
  
  // Attachments
  supporting_documents?: Array<{
    document_id: string;
    document_type: string;
    description: string;
  }>;
  
  // Status and timeline
  status: 'draft' | 'sent' | 'received' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  requested_appointment_timeframe?: string;
  
  // Dates
  created_at: string;
  sent_at?: string;
  received_at?: string;
  responded_at?: string;
  appointment_scheduled_at?: string;
  completed_at?: string;
  
  // Response
  response_notes?: string;
  decline_reason?: string;
  suggested_alternative?: string;
  
  // Follow-up
  follow_up_required: boolean;
  follow_up_timeframe?: string;
  
  // Metadata
  created_by: string;
  updated_at: string;
}

export class ReferralService {
  
  // Create referral
  static async createReferral(referralData: {
    patient_id: string;
    encounter_id?: string;
    from_entity_id: string;
    to_entity_id: string;
    referring_provider_id: string;
    type: Referral['type'];
    priority: Referral['priority'];
    specialty_required?: string;
    reason_for_referral: string;
    clinical_summary: string;
    relevant_history?: string;
    current_medications?: string;
    allergies?: string;
    primary_diagnosis?: string;
    diagnosis_codes?: string[];
    supporting_documents?: Referral['supporting_documents'];
    requested_appointment_timeframe?: string;
    follow_up_required: boolean;
    follow_up_timeframe?: string;
    created_by: string;
  }): Promise<Referral> {
    try {
      const referralNumber = await this.generateReferralNumber();
      
      const referral = await githubDB.insert(collections.referrals, {
        ...referralData,
        referral_number: referralNumber,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('referral_created', referral.id, referralData.created_by);
      
      logger.info('referral_created', 'Referral created successfully', {
        referral_id: referral.id,
        referral_number: referralNumber,
        patient_id: referralData.patient_id,
        from_entity: referralData.from_entity_id,
        to_entity: referralData.to_entity_id
      });
      
      return referral;
    } catch (error) {
      logger.error('referral_creation_failed', 'Failed to create referral', { error: error.message });
      throw error;
    }
  }
  
  // Send referral
  static async sendReferral(referralId: string, sentBy: string): Promise<Referral> {
    try {
      const referral = await githubDB.update(collections.referrals, referralId, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Notify receiving entity
      await this.notifyReceivingEntity(referralId);
      
      await this.logAuditEvent('referral_sent', referralId, sentBy);
      
      logger.info('referral_sent', 'Referral sent successfully', {
        referral_id: referralId,
        sent_by: sentBy
      });
      
      return referral;
    } catch (error) {
      logger.error('referral_send_failed', 'Failed to send referral', { 
        referral_id: referralId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Receive referral (mark as received)
  static async receiveReferral(referralId: string, receivedBy: string): Promise<Referral> {
    try {
      const referral = await githubDB.update(collections.referrals, referralId, {
        status: 'received',
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('referral_received', referralId, receivedBy);
      
      return referral;
    } catch (error) {
      logger.error('referral_receive_failed', 'Failed to receive referral', { 
        referral_id: referralId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Accept referral
  static async acceptReferral(referralId: string, acceptedBy: string, responseNotes?: string): Promise<Referral> {
    try {
      const referral = await githubDB.update(collections.referrals, referralId, {
        status: 'accepted',
        responded_at: new Date().toISOString(),
        response_notes: responseNotes,
        updated_at: new Date().toISOString()
      });
      
      // Notify referring provider
      await this.notifyReferringProvider(referralId, 'accepted');
      
      await this.logAuditEvent('referral_accepted', referralId, acceptedBy, {
        response_notes: responseNotes
      });
      
      logger.info('referral_accepted', 'Referral accepted', {
        referral_id: referralId,
        accepted_by: acceptedBy
      });
      
      return referral;
    } catch (error) {
      logger.error('referral_accept_failed', 'Failed to accept referral', { 
        referral_id: referralId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Decline referral
  static async declineReferral(referralId: string, declinedBy: string, declineReason: string, suggestedAlternative?: string): Promise<Referral> {
    try {
      const referral = await githubDB.update(collections.referrals, referralId, {
        status: 'declined',
        responded_at: new Date().toISOString(),
        decline_reason: declineReason,
        suggested_alternative: suggestedAlternative,
        updated_at: new Date().toISOString()
      });
      
      // Notify referring provider
      await this.notifyReferringProvider(referralId, 'declined');
      
      await this.logAuditEvent('referral_declined', referralId, declinedBy, {
        decline_reason: declineReason,
        suggested_alternative: suggestedAlternative
      });
      
      logger.info('referral_declined', 'Referral declined', {
        referral_id: referralId,
        declined_by: declinedBy,
        reason: declineReason
      });
      
      return referral;
    } catch (error) {
      logger.error('referral_decline_failed', 'Failed to decline referral', { 
        referral_id: referralId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Complete referral
  static async completeReferral(referralId: string, completedBy: string, completionNotes?: string): Promise<Referral> {
    try {
      const referral = await githubDB.update(collections.referrals, referralId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        response_notes: completionNotes,
        updated_at: new Date().toISOString()
      });
      
      // If follow-up required, create reminder
      if (referral.follow_up_required) {
        await this.createFollowUpReminder(referralId);
      }
      
      await this.logAuditEvent('referral_completed', referralId, completedBy, {
        completion_notes: completionNotes
      });
      
      return referral;
    } catch (error) {
      logger.error('referral_complete_failed', 'Failed to complete referral', { 
        referral_id: referralId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get outgoing referrals (from entity)
  static async getOutgoingReferrals(fromEntityId: string, status?: Referral['status']): Promise<Referral[]> {
    try {
      const filters: any = { from_entity_id: fromEntityId };
      if (status) filters.status = status;
      
      const referrals = await githubDB.find(collections.referrals, filters);
      
      return referrals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      logger.error('get_outgoing_referrals_failed', 'Failed to get outgoing referrals', { 
        from_entity_id: fromEntityId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get incoming referrals (to entity)
  static async getIncomingReferrals(toEntityId: string, status?: Referral['status']): Promise<Referral[]> {
    try {
      const filters: any = { to_entity_id: toEntityId };
      if (status) filters.status = status;
      
      const referrals = await githubDB.find(collections.referrals, filters);
      
      return referrals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      logger.error('get_incoming_referrals_failed', 'Failed to get incoming referrals', { 
        to_entity_id: toEntityId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get patient referrals
  static async getPatientReferrals(patientId: string): Promise<Referral[]> {
    try {
      const referrals = await githubDB.find(collections.referrals, { patient_id: patientId });
      
      return referrals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      logger.error('get_patient_referrals_failed', 'Failed to get patient referrals', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get pending referrals (requiring action)
  static async getPendingReferrals(entityId: string): Promise<{
    incoming_pending: Referral[];
    outgoing_pending: Referral[];
  }> {
    try {
      const [incomingPending, outgoingPending] = await Promise.all([
        this.getIncomingReferrals(entityId, 'received'),
        this.getOutgoingReferrals(entityId, 'sent')
      ]);
      
      return {
        incoming_pending: incomingPending,
        outgoing_pending: outgoingPending
      };
    } catch (error) {
      logger.error('get_pending_referrals_failed', 'Failed to get pending referrals', { error: error.message });
      return {
        incoming_pending: [],
        outgoing_pending: []
      };
    }
  }
  
  // Search referrals
  static async searchReferrals(entityId: string, query: string, direction: 'incoming' | 'outgoing' | 'both' = 'both'): Promise<Referral[]> {
    try {
      let referrals: Referral[] = [];
      
      if (direction === 'incoming' || direction === 'both') {
        const incoming = await this.getIncomingReferrals(entityId);
        referrals = [...referrals, ...incoming];
      }
      
      if (direction === 'outgoing' || direction === 'both') {
        const outgoing = await this.getOutgoingReferrals(entityId);
        referrals = [...referrals, ...outgoing];
      }
      
      // Filter by query
      const lowerQuery = query.toLowerCase();
      return referrals.filter(referral =>
        referral.referral_number.toLowerCase().includes(lowerQuery) ||
        referral.reason_for_referral.toLowerCase().includes(lowerQuery) ||
        referral.clinical_summary.toLowerCase().includes(lowerQuery) ||
        referral.primary_diagnosis?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      logger.error('search_referrals_failed', 'Failed to search referrals', { error: error.message });
      return [];
    }
  }
  
  // Generate referral number
  private static async generateReferralNumber(): Promise<string> {
    const prefix = 'REF';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
  
  // Notify receiving entity
  private static async notifyReceivingEntity(referralId: string): Promise<void> {
    try {
      const referral = await githubDB.findById(collections.referrals, referralId);
      if (!referral) return;
      
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: referral.to_entity_id,
        type: 'new_referral',
        title: 'New Referral Received',
        message: `New ${referral.priority} referral ${referral.referral_number} requires review`,
        data: { 
          referral_id: referralId,
          referral_number: referral.referral_number,
          priority: referral.priority
        },
        priority: referral.priority === 'emergency' ? 'high' : 'medium',
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      // Send email notification
      await EmailNotificationService.sendNotification({
        type: 'referral_received',
        recipient: `entity-${referral.to_entity_id}@placeholder.com`,
        data: { 
          referralId: referralId,
          referralNumber: referral.referral_number,
          priority: referral.priority
        }
      });
      
    } catch (error) {
      logger.error('notify_receiving_entity_failed', 'Failed to notify receiving entity', { error: error.message });
    }
  }
  
  // Notify referring provider
  private static async notifyReferringProvider(referralId: string, action: 'accepted' | 'declined'): Promise<void> {
    try {
      const referral = await githubDB.findById(collections.referrals, referralId);
      if (!referral) return;
      
      const title = action === 'accepted' ? 'Referral Accepted' : 'Referral Declined';
      const message = action === 'accepted' 
        ? `Your referral ${referral.referral_number} has been accepted`
        : `Your referral ${referral.referral_number} has been declined`;
      
      await githubDB.insert(collections.notifications, {
        recipient_type: 'entity',
        recipient_id: referral.from_entity_id,
        type: `referral_${action}`,
        title: title,
        message: message,
        data: { 
          referral_id: referralId,
          referral_number: referral.referral_number,
          action: action
        },
        is_read: false,
        created_at: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('notify_referring_provider_failed', 'Failed to notify referring provider', { error: error.message });
    }
  }
  
  // Create follow-up reminder
  private static async createFollowUpReminder(referralId: string): Promise<void> {
    try {
      const referral = await githubDB.findById(collections.referrals, referralId);
      if (!referral || !referral.follow_up_timeframe) return;
      
      // Calculate follow-up date
      const followUpDate = new Date();
      const timeframe = referral.follow_up_timeframe.toLowerCase();
      
      if (timeframe.includes('week')) {
        const weeks = parseInt(timeframe) || 1;
        followUpDate.setDate(followUpDate.getDate() + (weeks * 7));
      } else if (timeframe.includes('month')) {
        const months = parseInt(timeframe) || 1;
        followUpDate.setMonth(followUpDate.getMonth() + months);
      } else {
        const days = parseInt(timeframe) || 7;
        followUpDate.setDate(followUpDate.getDate() + days);
      }
      
      await githubDB.insert(collections.booking_reminders, {
        patient_id: referral.patient_id,
        entity_id: referral.from_entity_id,
        type: 'referral_follow_up',
        title: 'Referral Follow-up Due',
        message: `Follow-up required for referral ${referral.referral_number}`,
        due_date: followUpDate.toISOString(),
        data: { referral_id: referralId },
        status: 'pending',
        created_at: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('create_follow_up_reminder_failed', 'Failed to create follow-up reminder', { error: error.message });
    }
  }
  
  // Get referral statistics
  static async getReferralStats(entityId: string, startDate: string, endDate: string): Promise<{
    outgoing: {
      total: number;
      accepted: number;
      declined: number;
      pending: number;
      acceptance_rate: number;
    };
    incoming: {
      total: number;
      accepted: number;
      declined: number;
      pending: number;
      response_rate: number;
    };
    by_priority: { [key: string]: number };
    by_type: { [key: string]: number };
  }> {
    try {
      const [outgoing, incoming] = await Promise.all([
        githubDB.find(collections.referrals, { from_entity_id: entityId }),
        githubDB.find(collections.referrals, { to_entity_id: entityId })
      ]);
      
      // Filter by date range
      const outgoingFiltered = outgoing.filter(r => r.created_at >= startDate && r.created_at <= endDate);
      const incomingFiltered = incoming.filter(r => r.created_at >= startDate && r.created_at <= endDate);
      
      const stats = {
        outgoing: {
          total: outgoingFiltered.length,
          accepted: 0,
          declined: 0,
          pending: 0,
          acceptance_rate: 0
        },
        incoming: {
          total: incomingFiltered.length,
          accepted: 0,
          declined: 0,
          pending: 0,
          response_rate: 0
        },
        by_priority: {} as { [key: string]: number },
        by_type: {} as { [key: string]: number }
      };
      
      // Calculate outgoing stats
      outgoingFiltered.forEach(referral => {
        if (referral.status === 'accepted') stats.outgoing.accepted++;
        if (referral.status === 'declined') stats.outgoing.declined++;
        if (['sent', 'received'].includes(referral.status)) stats.outgoing.pending++;
        
        stats.by_priority[referral.priority] = (stats.by_priority[referral.priority] || 0) + 1;
        stats.by_type[referral.type] = (stats.by_type[referral.type] || 0) + 1;
      });
      
      // Calculate incoming stats
      incomingFiltered.forEach(referral => {
        if (referral.status === 'accepted') stats.incoming.accepted++;
        if (referral.status === 'declined') stats.incoming.declined++;
        if (['sent', 'received'].includes(referral.status)) stats.incoming.pending++;
      });
      
      // Calculate rates
      const outgoingResponded = stats.outgoing.accepted + stats.outgoing.declined;
      stats.outgoing.acceptance_rate = outgoingResponded > 0 ? (stats.outgoing.accepted / outgoingResponded) * 100 : 0;
      
      const incomingResponded = stats.incoming.accepted + stats.incoming.declined;
      stats.incoming.response_rate = stats.incoming.total > 0 ? (incomingResponded / stats.incoming.total) * 100 : 0;
      
      return stats;
    } catch (error) {
      logger.error('get_referral_stats_failed', 'Failed to get referral statistics', { error: error.message });
      return {
        outgoing: { total: 0, accepted: 0, declined: 0, pending: 0, acceptance_rate: 0 },
        incoming: { total: 0, accepted: 0, declined: 0, pending: 0, response_rate: 0 },
        by_priority: {},
        by_type: {}
      };
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, referralId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'referral',
        resource_id: referralId,
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