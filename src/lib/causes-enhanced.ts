// Enhanced Causes/Crowdfunding System with Transparency
import { githubDB, collections } from './database';
import { logger } from './observability';
import { emailService, EmailType } from './email';
import { EnhancedPaymentService } from './payments-enhanced';

export enum CauseStatus {
  DRAFT = 'draft',
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended'
}

export enum DisbursementStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  REJECTED = 'rejected'
}

export interface Cause {
  id: string;
  title: string;
  description: string;
  story: string;
  category: string;
  
  // Financial
  target_amount: number;
  raised_amount: number;
  currency: string;
  
  // Beneficiary information
  beneficiary: {
    name: string;
    contact_email: string;
    contact_phone?: string;
    address: any;
    verification_status: 'pending' | 'verified' | 'rejected';
    verification_documents?: string[];
    id_number?: string;
    bank_details?: {
      account_name: string;
      account_number: string;
      bank_name: string;
      routing_number?: string;
    };
  };
  
  // Organizer information
  organizer_id: string;
  organizer_name: string;
  organizer_verified: boolean;
  
  // Status and dates
  status: CauseStatus;
  start_date: string;
  end_date?: string;
  
  // Media and documentation
  images: string[];
  documents: string[];
  
  // Transparency
  disbursement_ledger: DisbursementEntry[];
  updates: CauseUpdate[];
  last_update_sent?: string;
  
  // Settings
  allow_anonymous_donations: boolean;
  show_donation_amounts: boolean;
  in_kind_requests?: InKindRequest[];
  
  // Metrics
  donor_count: number;
  share_count: number;
  view_count: number;
  
  // Verification and compliance
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface DisbursementEntry {
  id: string;
  cause_id: string;
  amount: number;
  purpose: string;
  recipient: string;
  disbursement_date: string;
  status: DisbursementStatus;
  reference_number?: string;
  receipt_url?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface CauseUpdate {
  id: string;
  cause_id: string;
  title: string;
  content: string;
  images?: string[];
  author_id: string;
  author_name: string;
  is_milestone: boolean;
  published_at: string;
  sent_to_donors: boolean;
}

export interface InKindRequest {
  id: string;
  cause_id: string;
  item_name: string;
  description: string;
  quantity_needed: number;
  quantity_received: number;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'fulfilled' | 'closed';
  created_at: string;
}

export interface Donation {
  id: string;
  cause_id: string;
  donor_id?: string;
  donor_name: string;
  donor_email: string;
  amount: number;
  currency: string;
  is_anonymous: boolean;
  message?: string;
  payment_intent_id: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  receipt_url?: string;
  created_at: string;
  completed_at?: string;
}

export class EnhancedCausesService {
  
  // Create cause
  static async createCause(causeData: {
    title: string;
    description: string;
    story: string;
    category: string;
    target_amount: number;
    currency: string;
    organizer_id: string;
    beneficiary: Partial<Cause['beneficiary']>;
    end_date?: string;
    images?: string[];
    allow_anonymous_donations?: boolean;
    show_donation_amounts?: boolean;
  }): Promise<Cause> {
    try {
      const organizer = await githubDB.findById(collections.users, causeData.organizer_id);
      const profile = await githubDB.find(collections.profiles, { user_id: causeData.organizer_id });
      
      if (!organizer) {
        throw new Error('Organizer not found');
      }

      const organizerProfile = profile[0];

      const cause: Partial<Cause> = {
        title: causeData.title,
        description: causeData.description,
        story: causeData.story,
        category: causeData.category,
        target_amount: causeData.target_amount,
        raised_amount: 0,
        currency: causeData.currency,
        beneficiary: {
          name: causeData.beneficiary.name || '',
          contact_email: causeData.beneficiary.contact_email || '',
          contact_phone: causeData.beneficiary.contact_phone,
          address: causeData.beneficiary.address || {},
          verification_status: 'pending'
        },
        organizer_id: causeData.organizer_id,
        organizer_name: `${organizerProfile?.first_name || ''} ${organizerProfile?.last_name || ''}`.trim(),
        organizer_verified: organizer.is_verified || false,
        status: CauseStatus.DRAFT,
        start_date: new Date().toISOString(),
        end_date: causeData.end_date,
        images: causeData.images || [],
        documents: [],
        disbursement_ledger: [],
        updates: [],
        allow_anonymous_donations: causeData.allow_anonymous_donations ?? true,
        show_donation_amounts: causeData.show_donation_amounts ?? true,
        in_kind_requests: [],
        donor_count: 0,
        share_count: 0,
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const savedCause = await githubDB.insert(collections.causes, cause);

      await logger.info('cause_created', 'Cause created', {
        cause_id: savedCause.id,
        organizer_id: causeData.organizer_id,
        target_amount: causeData.target_amount
      });

      return savedCause;
    } catch (error) {
      await logger.error('cause_creation_failed', 'Cause creation failed', {
        organizer_id: causeData.organizer_id,
        error: error.message
      });
      throw error;
    }
  }

  // Submit cause for verification
  static async submitForVerification(causeId: string, documents: string[]): Promise<Cause> {
    try {
      const cause = await githubDB.findById(collections.causes, causeId);
      if (!cause) {
        throw new Error('Cause not found');
      }

      const updatedCause = await githubDB.update(collections.causes, causeId, {
        status: CauseStatus.PENDING_VERIFICATION,
        documents,
        updated_at: new Date().toISOString()
      });

      // Notify verification team
      await this.notifyVerificationTeam(updatedCause);

      await logger.info('cause_submitted_for_verification', 'Cause submitted for verification', {
        cause_id: causeId
      });

      return updatedCause;
    } catch (error) {
      await logger.error('cause_verification_submission_failed', 'Cause verification submission failed', {
        cause_id: causeId,
        error: error.message
      });
      throw error;
    }
  }

  // Verify cause (admin function)
  static async verifyCause(
    causeId: string,
    decision: 'approve' | 'reject',
    notes: string,
    verifierId: string
  ): Promise<Cause> {
    try {
      const cause = await githubDB.findById(collections.causes, causeId);
      if (!cause) {
        throw new Error('Cause not found');
      }

      const newStatus = decision === 'approve' ? CauseStatus.ACTIVE : CauseStatus.CANCELLED;

      const updates: Partial<Cause> = {
        status: newStatus,
        verification_notes: notes,
        verified_by: verifierId,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (decision === 'approve') {
        updates.beneficiary = {
          ...cause.beneficiary,
          verification_status: 'verified'
        };
      }

      const updatedCause = await githubDB.update(collections.causes, causeId, updates);

      // Log admin action
      await githubDB.insert(collections.audit_logs, {
        user_id: verifierId,
        action: 'cause_verified',
        target: causeId,
        data: { decision, notes },
        timestamp: new Date().toISOString()
      });

      // Notify organizer
      await this.notifyOrganizer(updatedCause, decision, notes);

      await logger.info('cause_verified', 'Cause verification completed', {
        cause_id: causeId,
        decision,
        verifier_id: verifierId
      });

      return updatedCause;
    } catch (error) {
      await logger.error('cause_verification_failed', 'Cause verification failed', {
        cause_id: causeId,
        error: error.message
      });
      throw error;
    }
  }

  // Create donation
  static async createDonation(donationData: {
    cause_id: string;
    donor_id?: string;
    donor_name: string;
    donor_email: string;
    amount: number;
    is_anonymous?: boolean;
    message?: string;
  }): Promise<{ donation: Donation; payment_url: string }> {
    try {
      const cause = await githubDB.findById(collections.causes, donationData.cause_id);
      if (!cause) {
        throw new Error('Cause not found');
      }

      if (cause.status !== CauseStatus.ACTIVE) {
        throw new Error('Cause is not accepting donations');
      }

      // Create donation record
      const donation: Partial<Donation> = {
        cause_id: donationData.cause_id,
        donor_id: donationData.donor_id,
        donor_name: donationData.is_anonymous ? 'Anonymous' : donationData.donor_name,
        donor_email: donationData.donor_email,
        amount: donationData.amount,
        currency: cause.currency,
        is_anonymous: donationData.is_anonymous ?? false,
        message: donationData.message,
        payment_status: 'pending',
        created_at: new Date().toISOString()
      };

      const savedDonation = await githubDB.insert(collections.donations, donation);

      // Create payment intent
      const paymentIntent = await EnhancedPaymentService.createPaymentIntent({
        user_id: donationData.donor_id || 'anonymous',
        amount: donationData.amount,
        currency: cause.currency,
        gateway: 'stripe', // Default gateway
        item_type: 'donation',
        item_id: savedDonation.id,
        item_name: `Donation to ${cause.title}`,
        item_description: `Supporting ${cause.beneficiary.name}`,
        customer_email: donationData.donor_email,
        customer_name: donationData.donor_name,
        metadata: {
          cause_id: donationData.cause_id,
          cause_title: cause.title
        }
      });

      // Update donation with payment intent
      await githubDB.update(collections.donations, savedDonation.id, {
        payment_intent_id: paymentIntent.id
      });

      // Generate payment URL
      const { redirect_url } = await EnhancedPaymentService.initializeGatewayPayment(paymentIntent.id);

      await logger.info('donation_created', 'Donation created', {
        donation_id: savedDonation.id,
        cause_id: donationData.cause_id,
        amount: donationData.amount
      });

      return { donation: savedDonation, payment_url: redirect_url };
    } catch (error) {
      await logger.error('donation_creation_failed', 'Donation creation failed', {
        cause_id: donationData.cause_id,
        error: error.message
      });
      throw error;
    }
  }

  // Complete donation (called by payment webhook)
  static async completeDonation(donationId: string): Promise<void> {
    try {
      const donation = await githubDB.findById(collections.donations, donationId);
      if (!donation) {
        throw new Error('Donation not found');
      }

      const cause = await githubDB.findById(collections.causes, donation.cause_id);
      if (!cause) {
        throw new Error('Cause not found');
      }

      // Update donation status
      await githubDB.update(collections.donations, donationId, {
        payment_status: 'completed',
        completed_at: new Date().toISOString()
      });

      // Update cause totals
      const newRaisedAmount = cause.raised_amount + donation.amount;
      const newDonorCount = cause.donor_count + 1;

      await githubDB.update(collections.causes, donation.cause_id, {
        raised_amount: newRaisedAmount,
        donor_count: newDonorCount,
        updated_at: new Date().toISOString()
      });

      // Send receipt
      await this.sendDonationReceipt(donation, cause);

      // Check if goal reached
      if (newRaisedAmount >= cause.target_amount && cause.raised_amount < cause.target_amount) {
        await this.handleGoalReached(cause);
      }

      await logger.info('donation_completed', 'Donation completed', {
        donation_id: donationId,
        cause_id: donation.cause_id,
        amount: donation.amount,
        new_total: newRaisedAmount
      });

    } catch (error) {
      await logger.error('donation_completion_failed', 'Donation completion failed', {
        donation_id: donationId,
        error: error.message
      });
    }
  }

  // Create disbursement entry
  static async createDisbursement(disbursementData: {
    cause_id: string;
    amount: number;
    purpose: string;
    recipient: string;
    approved_by: string;
    receipt_url?: string;
    notes?: string;
  }): Promise<DisbursementEntry> {
    try {
      const cause = await githubDB.findById(collections.causes, disbursementData.cause_id);
      if (!cause) {
        throw new Error('Cause not found');
      }

      const disbursement: Partial<DisbursementEntry> = {
        cause_id: disbursementData.cause_id,
        amount: disbursementData.amount,
        purpose: disbursementData.purpose,
        recipient: disbursementData.recipient,
        disbursement_date: new Date().toISOString(),
        status: DisbursementStatus.DISBURSED,
        reference_number: this.generateReferenceNumber(),
        receipt_url: disbursementData.receipt_url,
        notes: disbursementData.notes,
        approved_by: disbursementData.approved_by,
        approved_at: new Date().toISOString()
      };

      const savedDisbursement = await githubDB.insert(collections.disbursements, disbursement);

      // Update cause disbursement ledger
      const updatedLedger = [...cause.disbursement_ledger, savedDisbursement];
      await githubDB.update(collections.causes, disbursementData.cause_id, {
        disbursement_ledger: updatedLedger,
        updated_at: new Date().toISOString()
      });

      await logger.info('disbursement_created', 'Disbursement created', {
        disbursement_id: savedDisbursement.id,
        cause_id: disbursementData.cause_id,
        amount: disbursementData.amount
      });

      return savedDisbursement;
    } catch (error) {
      await logger.error('disbursement_creation_failed', 'Disbursement creation failed', {
        cause_id: disbursementData.cause_id,
        error: error.message
      });
      throw error;
    }
  }

  // Create cause update
  static async createCauseUpdate(updateData: {
    cause_id: string;
    title: string;
    content: string;
    images?: string[];
    author_id: string;
    is_milestone?: boolean;
  }): Promise<CauseUpdate> {
    try {
      const cause = await githubDB.findById(collections.causes, updateData.cause_id);
      const author = await githubDB.findById(collections.users, updateData.author_id);
      const profile = await githubDB.find(collections.profiles, { user_id: updateData.author_id });

      if (!cause || !author) {
        throw new Error('Cause or author not found');
      }

      const authorProfile = profile[0];

      const update: Partial<CauseUpdate> = {
        cause_id: updateData.cause_id,
        title: updateData.title,
        content: updateData.content,
        images: updateData.images || [],
        author_id: updateData.author_id,
        author_name: `${authorProfile?.first_name || ''} ${authorProfile?.last_name || ''}`.trim(),
        is_milestone: updateData.is_milestone ?? false,
        published_at: new Date().toISOString(),
        sent_to_donors: false
      };

      const savedUpdate = await githubDB.insert(collections.cause_updates, update);

      // Update cause updates array
      const updatedUpdates = [...cause.updates, savedUpdate];
      await githubDB.update(collections.causes, updateData.cause_id, {
        updates: updatedUpdates,
        updated_at: new Date().toISOString()
      });

      // Send update to donors
      await this.sendUpdateToDonors(cause, savedUpdate);

      await logger.info('cause_update_created', 'Cause update created', {
        update_id: savedUpdate.id,
        cause_id: updateData.cause_id,
        is_milestone: updateData.is_milestone
      });

      return savedUpdate;
    } catch (error) {
      await logger.error('cause_update_creation_failed', 'Cause update creation failed', {
        cause_id: updateData.cause_id,
        error: error.message
      });
      throw error;
    }
  }

  // Send monthly updates to all active causes
  static async sendMonthlyUpdates(): Promise<void> {
    try {
      const activeCauses = await githubDB.find(collections.causes, {
        status: CauseStatus.ACTIVE
      });

      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      for (const cause of activeCauses) {
        // Check if update was sent in the last month
        if (cause.last_update_sent && cause.last_update_sent > oneMonthAgo) {
          continue;
        }

        // Check if there are recent updates
        const recentUpdates = cause.updates.filter((update: CauseUpdate) => 
          update.published_at > oneMonthAgo
        );

        if (recentUpdates.length === 0) {
          // Create automatic monthly update
          await this.createAutomaticUpdate(cause);
        }

        // Mark as updated
        await githubDB.update(collections.causes, cause.id, {
          last_update_sent: new Date().toISOString()
        });
      }

      await logger.info('monthly_updates_sent', 'Monthly updates processing completed', {
        causes_processed: activeCauses.length
      });

    } catch (error) {
      await logger.error('monthly_updates_failed', 'Monthly updates failed', {
        error: error.message
      });
    }
  }

  // Helper methods
  private static async notifyVerificationTeam(cause: Cause): Promise<void> {
    try {
      const adminUsers = await githubDB.find(collections.users, {
        user_type: { $in: ['super_admin', 'compliance_officer'] }
      });

      for (const admin of adminUsers) {
        await githubDB.insert(collections.notifications, {
          user_id: admin.id,
          type: 'verification',
          title: 'New Cause for Verification',
          message: `Cause "${cause.title}" submitted for verification`,
          data: {
            cause_id: cause.id,
            organizer: cause.organizer_name
          },
          priority: 'medium',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }

    } catch (error) {
      await logger.error('verification_team_notification_failed', 'Verification team notification failed', {
        cause_id: cause.id,
        error: error.message
      });
    }
  }

  private static async notifyOrganizer(cause: Cause, decision: string, notes: string): Promise<void> {
    try {
      const organizer = await githubDB.findById(collections.users, cause.organizer_id);
      if (!organizer) return;

      const emailType = decision === 'approve' ? EmailType.CAUSE_UPDATE : EmailType.COMPLIANCE_NOTICE;

      await emailService.sendEmail(organizer.email, emailType, {
        user: {
          email: organizer.email
        },
        cause: {
          title: cause.title,
          verification_decision: decision,
          verification_notes: notes
        }
      });

    } catch (error) {
      await logger.error('organizer_notification_failed', 'Organizer notification failed', {
        cause_id: cause.id,
        error: error.message
      });
    }
  }

  private static async sendDonationReceipt(donation: Donation, cause: Cause): Promise<void> {
    try {
      await emailService.sendEmail(donation.donor_email, EmailType.DONATION_CONFIRMATION, {
        user: {
          first_name: donation.donor_name.split(' ')[0],
          email: donation.donor_email
        },
        cause: {
          title: cause.title,
          impact_message: `Your ${donation.currency} ${donation.amount} donation will help ${cause.beneficiary.name} reach their goal.`
        },
        donation: {
          amount: donation.amount,
          date: new Date(donation.completed_at!).toLocaleDateString(),
          transaction_id: donation.id
        }
      });

    } catch (error) {
      await logger.error('donation_receipt_failed', 'Donation receipt failed', {
        donation_id: donation.id,
        error: error.message
      });
    }
  }

  private static async handleGoalReached(cause: Cause): Promise<void> {
    try {
      // Notify organizer
      const organizer = await githubDB.findById(collections.users, cause.organizer_id);
      if (organizer) {
        await emailService.sendEmail(organizer.email, EmailType.GOAL_REACHED, {
          user: {
            email: organizer.email
          },
          cause: {
            title: cause.title,
            target_amount: cause.target_amount,
            raised_amount: cause.raised_amount
          }
        });
      }

      // Create milestone update
      await this.createCauseUpdate({
        cause_id: cause.id,
        title: '🎉 Goal Reached!',
        content: `We've reached our target of ${cause.currency} ${cause.target_amount}! Thank you to all ${cause.donor_count} donors who made this possible.`,
        author_id: cause.organizer_id,
        is_milestone: true
      });

    } catch (error) {
      await logger.error('goal_reached_handling_failed', 'Goal reached handling failed', {
        cause_id: cause.id,
        error: error.message
      });
    }
  }

  private static async sendUpdateToDonors(cause: Cause, update: CauseUpdate): Promise<void> {
    try {
      // Get all donors for this cause
      const donations = await githubDB.find(collections.donations, {
        cause_id: cause.id,
        payment_status: 'completed'
      });

      const uniqueDonors = new Map();
      donations.forEach((donation: Donation) => {
        if (!donation.is_anonymous && donation.donor_email) {
          uniqueDonors.set(donation.donor_email, donation);
        }
      });

      // Send update email to each donor
      for (const [email, donation] of uniqueDonors) {
        await emailService.sendEmail(email, EmailType.CAUSE_UPDATE, {
          user: {
            first_name: donation.donor_name.split(' ')[0],
            email: email
          },
          cause: {
            title: cause.title,
            updates_link: `${window.location.origin}/causes/${cause.id}`
          },
          update: {
            title: update.title,
            content: update.content.substring(0, 300) + '...'
          }
        });
      }

      // Mark update as sent
      await githubDB.update(collections.cause_updates, update.id, {
        sent_to_donors: true
      });

    } catch (error) {
      await logger.error('update_to_donors_failed', 'Update to donors failed', {
        cause_id: cause.id,
        update_id: update.id,
        error: error.message
      });
    }
  }

  private static async createAutomaticUpdate(cause: Cause): Promise<void> {
    try {
      const progressPercentage = Math.round((cause.raised_amount / cause.target_amount) * 100);
      
      const automaticUpdate = {
        cause_id: cause.id,
        title: 'Monthly Progress Update',
        content: `We've raised ${cause.currency} ${cause.raised_amount} (${progressPercentage}% of our ${cause.currency} ${cause.target_amount} goal) thanks to ${cause.donor_count} generous donors. Thank you for your continued support!`,
        author_id: cause.organizer_id,
        is_milestone: false
      };

      await this.createCauseUpdate(automaticUpdate);

    } catch (error) {
      await logger.error('automatic_update_creation_failed', 'Automatic update creation failed', {
        cause_id: cause.id,
        error: error.message
      });
    }
  }

  private static generateReferenceNumber(): string {
    return `DISB${Date.now().toString().slice(-8)}`;
  }
}