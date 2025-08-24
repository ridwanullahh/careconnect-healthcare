// Enhanced Crowdfunding System for Medical Causes
import { githubDB, collections } from './database';
import PaymentService from './payments-enhanced';

export interface Cause {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  category: 'medical_treatment' | 'emergency_care' | 'medical_equipment' | 'rehabilitation' | 'research' | 'other';
  targetAmount: number;
  currentAmount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryAge?: number;
  beneficiaryLocation: string;
  organizer: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
    relationship: string; // e.g., "mother", "friend", "self"
  };
  medicalCondition: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  images: string[];
  documents: CauseDocument[];
  status: 'draft' | 'pending_verification' | 'active' | 'paused' | 'completed' | 'cancelled';
  isVerified: boolean;
  verificationDocuments: string[];
  verifiedAt?: string;
  verifiedBy?: string;
  startDate: string;
  endDate: string;
  donorCount: number;
  shareCount: number;
  lastUpdateAt: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  featuredUntil?: string;
  withdrawnAmount: number;
  availableForWithdrawal: number;
}

export interface CauseDocument {
  id: string;
  name: string;
  type: 'medical_report' | 'hospital_bill' | 'prescription' | 'insurance_claim' | 'other';
  url: string;
  uploadedAt: string;
  isPublic: boolean;
}

export interface Donation {
  id: string;
  causeId: string;
  donorId?: string; // null for anonymous donations
  donorName?: string;
  donorEmail?: string;
  amount: number;
  currency: string;
  isAnonymous: boolean;
  message?: string;
  paymentIntentId: string;
  status: 'pending_payment' | 'pending_review' | 'completed' | 'failed' | 'refunded';
  donatedAt: string;
  processedAt?: string;
  receiptUrl?: string;
  dedicatedTo?: string;
  source: 'web' | 'mobile' | 'social_share';
}

export interface CauseUpdate {
  id: string;
  causeId: string;
  title: string;
  content: string;
  images: string[];
  updateType: 'progress' | 'medical' | 'financial' | 'thank_you' | 'general';
  isPublic: boolean;
  postedAt: string;
  postedBy: string;
}

export interface Disbursement {
  id: string;
  causeId: string;
  amount: number;
  currency: string;
  purpose: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'disbursed' | 'rejected';
  requestedAt: string;
  approvedAt?: string;
  disbursedAt?: string;
  rejectionReason?: string;
  supportingDocuments: string[];
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    routingNumber?: string;
  };
  transactionReference?: string;
}

export interface InKindRequest {
  id: string;
  causeId: string;
  title: string;
  description: string;
  category: 'medical_equipment' | 'medication' | 'supplies' | 'services' | 'other';
  quantity?: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
  status: 'open' | 'partially_fulfilled' | 'fulfilled' | 'closed';
  requestedAt: string;
  fulfilledAt?: string;
  images: string[];
  specifications?: Record<string, any>;
}

export class CrowdfundingService {
  // Create a new cause
  static async createCause(causeData: Omit<Cause, 'id' | 'currentAmount' | 'donorCount' | 'shareCount' | 'lastUpdateAt' | 'createdAt' | 'updatedAt' | 'withdrawnAmount' | 'availableForWithdrawal'>): Promise<Cause> {
    const cause: Cause = {
      id: `cause_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...causeData,
      currentAmount: 0,
      donorCount: 0,
      shareCount: 0,
      withdrawnAmount: 0,
      availableForWithdrawal: 0,
      lastUpdateAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await githubDB.create(collections.causes, cause);
    return cause;
  }

  // Create donation with payment intent
  static async createDonation(
    causeId: string,
    amount: number,
    currency: string,
    donorId?: string,
    donorName?: string,
    donorEmail?: string,
    isAnonymous: boolean = false,
    message?: string,
    dedicatedTo?: string
  ): Promise<{ donation: Donation; paymentIntent: any }> {
    const cause = await githubDB.findById(collections.causes, causeId);
    if (!cause) throw new Error('Cause not found');
    if (cause.status !== 'active') throw new Error('Cause is not active for donations');

    // Create payment intent
    const paymentIntent = await PaymentService.createPaymentIntent(
      amount,
      currency,
      `Donation to ${cause.title}`,
      { causeId, donorId, type: 'donation' },
      donorId
    );

    const donation: Donation = {
      id: `donation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      causeId,
      donorId: isAnonymous ? undefined : donorId,
      donorName: isAnonymous ? 'Anonymous' : donorName,
      donorEmail,
      amount,
      currency,
      isAnonymous,
      message,
      dedicatedTo,
      paymentIntentId: paymentIntent.id,
      status: 'pending_payment',
      donatedAt: new Date().toISOString(),
      source: 'web'
    };

    await githubDB.create(collections.donations, donation);
    return { donation, paymentIntent };
  }

  // Process donation after payment confirmation
  static async processDonationPayment(donationId: string, paymentIntentId: string): Promise<Donation> {
    const donation = await githubDB.findById(collections.donations, donationId);
    if (!donation) throw new Error('Donation not found');

    const paymentIntent = await githubDB.findById(collections.payments, paymentIntentId);
    if (!paymentIntent) throw new Error('Payment intent not found');

    let status: Donation['status'];
    let processedAt: string | undefined;

    switch (paymentIntent.status) {
      case 'completed':
        status = 'completed';
        processedAt = new Date().toISOString();
        break;
      case 'pending_review':
        status = 'pending_review';
        break;
      default:
        status = 'failed';
    }

    const updatedDonation = {
      ...donation,
      status,
      processedAt,
    };

    await githubDB.update(collections.donations, donationId, updatedDonation);

    // If completed, update cause totals
    if (status === 'completed') {
      await this.updateCauseTotals(donation.causeId);
      
      // Send thank you notification
      if (donation.donorId) {
        await this.sendDonationThankYou(donation);
      }
    }

    return updatedDonation;
  }

  // Update cause totals after donation
  private static async updateCauseTotals(causeId: string): Promise<void> {
    const donations = await githubDB.findMany(collections.donations, {
      causeId,
      status: 'completed'
    });

    const currentAmount = donations.reduce((sum, d) => sum + d.amount, 0);
    const donorCount = new Set(donations.filter(d => !d.isAnonymous).map(d => d.donorId)).size;
    
    // Calculate available for withdrawal (completed donations minus withdrawn amount)
    const cause = await githubDB.findById(collections.causes, causeId);
    const availableForWithdrawal = currentAmount - (cause?.withdrawnAmount || 0);

    await githubDB.update(collections.causes, causeId, {
      currentAmount,
      donorCount,
      availableForWithdrawal,
      lastUpdateAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Send donation thank you notification
  private static async sendDonationThankYou(donation: Donation): Promise<void> {
    if (!donation.donorId) return;

    const cause = await githubDB.findById(collections.causes, donation.causeId);
    if (!cause) return;

    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: donation.donorId,
      type: 'donation_thank_you',
      title: 'Thank You for Your Donation',
      message: `Thank you for donating ${donation.currency} ${donation.amount} to "${cause.title}"`,
      data: { donationId: donation.id, causeId: cause.id },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'normal'
    });
  }

  // Create cause update
  static async createCauseUpdate(
    causeId: string,
    title: string,
    content: string,
    updateType: CauseUpdate['updateType'],
    postedBy: string,
    images: string[] = [],
    isPublic: boolean = true
  ): Promise<CauseUpdate> {
    const cause = await githubDB.findById(collections.causes, causeId);
    if (!cause) throw new Error('Cause not found');

    const update: CauseUpdate = {
      id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      causeId,
      title: title.trim(),
      content: content.trim(),
      images,
      updateType,
      isPublic,
      postedAt: new Date().toISOString(),
      postedBy
    };

    await githubDB.create(collections.cause_updates, update);

    // Update cause last activity
    await githubDB.update(collections.causes, causeId, {
      lastUpdateAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Notify donors if public update
    if (isPublic) {
      await this.notifyDonorsOfUpdate(causeId, update);
    }

    return update;
  }

  // Notify donors of cause update
  private static async notifyDonorsOfUpdate(causeId: string, update: CauseUpdate): Promise<void> {
    const donations = await githubDB.findMany(collections.donations, {
      causeId,
      status: 'completed',
      donorId: { $ne: null }
    });

    const uniqueDonorIds = [...new Set(donations.map(d => d.donorId).filter(Boolean))];

    for (const donorId of uniqueDonorIds) {
      await githubDB.create(collections.notifications, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: donorId!,
        type: 'cause_update',
        title: 'Cause Update',
        message: `New update for a cause you supported: "${update.title}"`,
        data: { causeId, updateId: update.id },
        createdAt: new Date().toISOString(),
        read: false,
        priority: 'normal'
      });
    }
  }

  // Request disbursement
  static async requestDisbursement(
    causeId: string,
    amount: number,
    purpose: string,
    requestedBy: string,
    supportingDocuments: string[],
    bankDetails?: Disbursement['bankDetails']
  ): Promise<Disbursement> {
    const cause = await githubDB.findById(collections.causes, causeId);
    if (!cause) throw new Error('Cause not found');
    if (amount > cause.availableForWithdrawal) {
      throw new Error('Requested amount exceeds available funds');
    }

    const disbursement: Disbursement = {
      id: `disb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      causeId,
      amount,
      currency: cause.currency,
      purpose: purpose.trim(),
      requestedBy,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      supportingDocuments,
      bankDetails
    };

    await githubDB.create(collections.disbursements, disbursement);

    // Create notification for admins
    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'admin',
      type: 'disbursement_request',
      title: 'Disbursement Request',
      message: `New disbursement request for ${cause.currency} ${amount} from "${cause.title}"`,
      data: { disbursementId: disbursement.id, causeId },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'high'
    });

    return disbursement;
  }

  // Approve/reject disbursement
  static async processDisbursementRequest(
    disbursementId: string,
    action: 'approve' | 'reject',
    approvedBy: string,
    rejectionReason?: string,
    transactionReference?: string
  ): Promise<Disbursement> {
    const disbursement = await githubDB.findById(collections.disbursements, disbursementId);
    if (!disbursement) throw new Error('Disbursement not found');

    const updates: Partial<Disbursement> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy,
      approvedAt: new Date().toISOString()
    };

    if (action === 'reject' && rejectionReason) {
      updates.rejectionReason = rejectionReason;
    } else if (action === 'approve') {
      updates.disbursedAt = new Date().toISOString();
      updates.status = 'disbursed';
      updates.transactionReference = transactionReference;

      // Update cause withdrawn amount
      const cause = await githubDB.findById(collections.causes, disbursement.causeId);
      if (cause) {
        const newWithdrawnAmount = cause.withdrawnAmount + disbursement.amount;
        const newAvailableAmount = cause.currentAmount - newWithdrawnAmount;
        
        await githubDB.update(collections.causes, disbursement.causeId, {
          withdrawnAmount: newWithdrawnAmount,
          availableForWithdrawal: Math.max(0, newAvailableAmount),
          updatedAt: new Date().toISOString()
        });
      }
    }

    await githubDB.update(collections.disbursements, disbursementId, updates);

    // Notify requester
    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: disbursement.requestedBy,
      type: 'disbursement_status',
      title: `Disbursement ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: `Your disbursement request has been ${action}d`,
      data: { disbursementId, action, rejectionReason },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'high'
    });

    return { ...disbursement, ...updates };
  }

  // Create in-kind request
  static async createInKindRequest(requestData: Omit<InKindRequest, 'id' | 'status' | 'requestedAt' | 'fulfilledAt'>): Promise<InKindRequest> {
    const cause = await githubDB.findById(collections.causes, requestData.causeId);
    if (!cause) throw new Error('Cause not found');

    const request: InKindRequest = {
      id: `inkind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...requestData,
      status: 'open',
      requestedAt: new Date().toISOString()
    };

    await githubDB.create(collections.analytics_events, {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'in_kind_request_created',
      entityType: 'in_kind_request',
      entityId: request.id,
      userId: cause.organizer.userId,
      data: request,
      timestamp: new Date().toISOString()
    });

    return request;
  }

  // Verify beneficiary
  static async verifyBeneficiary(
    causeId: string,
    verifiedBy: string,
    verificationDocuments: string[]
  ): Promise<void> {
    await githubDB.update(collections.causes, causeId, {
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy,
      verificationDocuments,
      updatedAt: new Date().toISOString()
    });

    const cause = await githubDB.findById(collections.causes, causeId);
    if (cause) {
      // Notify organizer
      await githubDB.create(collections.notifications, {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: cause.organizer.userId,
        type: 'cause_verified',
        title: 'Cause Verified',
        message: `Your cause "${cause.title}" has been verified`,
        data: { causeId },
        createdAt: new Date().toISOString(),
        read: false,
        priority: 'high'
      });
    }
  }

  // Schedule monthly update reminders
  static async scheduleMonthlyUpdateReminders(): Promise<void> {
    const activeCauses = await githubDB.findMany(collections.causes, {
      status: 'active'
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const cause of activeCauses) {
      const lastUpdate = new Date(cause.lastUpdateAt);
      
      if (lastUpdate < thirtyDaysAgo) {
        // Send reminder to organizer
        await githubDB.create(collections.notifications, {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: cause.organizer.userId,
          type: 'update_reminder',
          title: 'Time for a Cause Update',
          message: `It's been over 30 days since your last update for "${cause.title}". Consider posting an update for your donors.`,
          data: { causeId: cause.id },
          createdAt: new Date().toISOString(),
          read: false,
          priority: 'normal'
        });
      }
    }
  }

  // Get cause donations
  static async getCauseDonations(causeId: string): Promise<Donation[]> {
    return await githubDB.findMany(collections.donations, {
      causeId,
      status: 'completed'
    });
  }

  // Get cause updates
  static async getCauseUpdates(causeId: string): Promise<CauseUpdate[]> {
    const updates = await githubDB.findMany(collections.cause_updates, { causeId });
    return updates.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }

  // Get disbursement history
  static async getDisbursementHistory(causeId: string): Promise<Disbursement[]> {
    return await githubDB.findMany(collections.disbursements, { causeId });
  }

  // Search causes
  static async searchCauses(
    query?: string,
    filters?: {
      category?: string;
      urgencyLevel?: string;
      isVerified?: boolean;
      location?: string;
    },
    sortBy: 'newest' | 'ending_soon' | 'most_funded' | 'most_urgent' = 'newest'
  ): Promise<Cause[]> {
    let causes = await githubDB.findMany(collections.causes, {
      status: 'active'
    });

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      causes = causes.filter(cause =>
        cause.title.toLowerCase().includes(lowerQuery) ||
        cause.description.toLowerCase().includes(lowerQuery) ||
        cause.medicalCondition.toLowerCase().includes(lowerQuery) ||
        cause.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        causes = causes.filter(c => c.category === filters.category);
      }
      if (filters.urgencyLevel) {
        causes = causes.filter(c => c.urgencyLevel === filters.urgencyLevel);
      }
      if (filters.isVerified !== undefined) {
        causes = causes.filter(c => c.isVerified === filters.isVerified);
      }
      if (filters.location) {
        causes = causes.filter(c => c.beneficiaryLocation.toLowerCase().includes(filters.location!.toLowerCase()));
      }
    }

    // Sort causes
    switch (sortBy) {
      case 'newest':
        causes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'ending_soon':
        causes.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        break;
      case 'most_funded':
        causes.sort((a, b) => (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount));
        break;
      case 'most_urgent':
        const urgencyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        causes.sort((a, b) => urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel]);
        break;
    }

    return causes;
  }

  // Get featured causes
  static async getFeaturedCauses(limit: number = 6): Promise<Cause[]> {
    const now = new Date().toISOString();
    let featured = await githubDB.findMany(collections.causes, {
      status: 'active',
      featuredUntil: { $gt: now }
    });

    // If not enough featured causes, add popular ones
    if (featured.length < limit) {
      const popular = await githubDB.findMany(collections.causes, {
        status: 'active'
      });
      
      popular.sort((a, b) => b.donorCount - a.donorCount);
      
      const additionalNeeded = limit - featured.length;
      const additional = popular
        .filter(c => !featured.some(f => f.id === c.id))
        .slice(0, additionalNeeded);
      
      featured = [...featured, ...additional];
    }

    return featured.slice(0, limit);
  }
}

export default CrowdfundingService;