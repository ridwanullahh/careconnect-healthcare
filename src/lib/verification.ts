// Directory Entity Verification System
import { githubDB, collections } from './database';

export interface VerificationRequest {
  id: string;
  entityId: string;
  requestType: 'initial' | 're-verification';
  submittedAt: string;
  submittedBy: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  documents: VerificationDocument[];
  expiresAt?: string;
}

export interface VerificationDocument {
  id: string;
  verificationRequestId: string;
  documentType: 'license' | 'accreditation' | 'certification' | 'insurance' | 'other';
  fileName: string;
  fileSize: number;
  base64Content: string;
  uploadedAt: string;
  uploadedBy: string;
  metadata: {
    issuer?: string;
    issuedDate?: string;
    expiryDate?: string;
    licenseNumber?: string;
  };
}

export interface EntityVerification {
  entityId: string;
  status: 'pending' | 'verified' | 'rejected' | 're-verify';
  verifiedAt?: string;
  expiresAt?: string;
  lastVerificationRequestId?: string;
  verificationLevel: 'basic' | 'standard' | 'premium';
  badges: string[];
  reminders: {
    thirtyDays?: string;
    sevenDays?: string;
    oneDay?: string;
  };
}

export class VerificationService {
  // Submit verification request
  static async submitVerificationRequest(
    entityId: string,
    documents: Omit<VerificationDocument, 'id' | 'verificationRequestId' | 'uploadedAt'>[],
    requestType: 'initial' | 're-verification' = 'initial',
    submittedBy: string
  ): Promise<VerificationRequest> {
    const requestId = `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const verificationRequest: VerificationRequest = {
      id: requestId,
      entityId,
      requestType,
      submittedAt: new Date().toISOString(),
      submittedBy,
      status: 'pending',
      documents: documents.map((doc, index) => ({
        ...doc,
        id: `doc_${requestId}_${index}`,
        verificationRequestId: requestId,
        uploadedAt: new Date().toISOString()
      }))
    };

    // Save verification request
    await githubDB.create(collections.verification_requests, verificationRequest);

    // Save documents separately for better querying
    for (const doc of verificationRequest.documents) {
      await githubDB.create(collections.verification_documents, doc);
    }

    // Update entity verification status
    await this.updateEntityVerificationStatus(entityId, 'pending', requestId);

    return verificationRequest;
  }

  // Admin review verification request
  static async reviewVerificationRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<void> {
    const request = await githubDB.findById(collections.verification_requests, requestId);
    if (!request) throw new Error('Verification request not found');

    // Update request
    const updatedRequest = {
      ...request,
      status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNotes
    };

    await githubDB.update(collections.verification_requests, requestId, updatedRequest);

    // Update entity verification status
    const entityStatus = status === 'approved' ? 'verified' : 'rejected';
    await this.updateEntityVerificationStatus(request.entityId, entityStatus, requestId);

    // Log audit trail
    await githubDB.create(collections.audit_logs, {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'verification_review',
      entityType: 'verification_request',
      entityId: requestId,
      performedBy: reviewedBy,
      performedAt: new Date().toISOString(),
      details: { status, reviewNotes },
      ipAddress: 'client-side'
    });
  }

  // Update entity verification status
  static async updateEntityVerificationStatus(
    entityId: string,
    status: EntityVerification['status'],
    verificationRequestId?: string
  ): Promise<void> {
    const existing = await githubDB.findOne(collections.entity_verification, { entityId });
    
    const verification: EntityVerification = {
      entityId,
      status,
      verifiedAt: status === 'verified' ? new Date().toISOString() : existing?.verifiedAt,
      expiresAt: status === 'verified' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      lastVerificationRequestId: verificationRequestId || existing?.lastVerificationRequestId,
      verificationLevel: status === 'verified' ? 'standard' : existing?.verificationLevel || 'basic',
      badges: status === 'verified' ? ['verified'] : [],
      reminders: existing?.reminders || {}
    };

    if (existing) {
      await githubDB.update(collections.entity_verification, existing.id, verification);
    } else {
      await githubDB.create(collections.entity_verification, {
        id: `entver_${entityId}`,
        ...verification
      });
    }
  }

  // Get verification requests for admin review
  static async getVerificationQueue(status?: string): Promise<VerificationRequest[]> {
    const filter = status ? { status } : {};
    return await githubDB.findMany(collections.verification_requests, filter);
  }

  // Get entity verification status
  static async getEntityVerification(entityId: string): Promise<EntityVerification | null> {
    return await githubDB.findOne(collections.entity_verification, { entityId });
  }

  // Schedule re-verification reminders
  static async scheduleReVerificationReminders(): Promise<void> {
    const verifications = await githubDB.findMany(collections.entity_verification, {
      status: 'verified'
    });

    const now = new Date();
    
    for (const verification of verifications) {
      if (!verification.expiresAt) continue;
      
      const expiryDate = new Date(verification.expiresAt);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Schedule reminders at 30, 7, and 1 days before expiry
      if (daysUntilExpiry === 30 && !verification.reminders.thirtyDays) {
        await this.sendReminderNotification(verification.entityId, '30 days');
        verification.reminders.thirtyDays = now.toISOString();
      } else if (daysUntilExpiry === 7 && !verification.reminders.sevenDays) {
        await this.sendReminderNotification(verification.entityId, '7 days');
        verification.reminders.sevenDays = now.toISOString();
      } else if (daysUntilExpiry === 1 && !verification.reminders.oneDay) {
        await this.sendReminderNotification(verification.entityId, '1 day');
        verification.reminders.oneDay = now.toISOString();
      }
      
      // Update verification record with reminder timestamps
      await githubDB.update(collections.entity_verification, verification.id, verification);
    }
  }

  // Send reminder notification
  private static async sendReminderNotification(entityId: string, timeframe: string): Promise<void> {
    const entity = await githubDB.findById(collections.entities, entityId);
    if (!entity) return;

    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: entity.ownerId || entity.primaryContactId,
      type: 'verification_reminder',
      title: 'Verification Renewal Required',
      message: `Your entity verification expires in ${timeframe}. Please submit renewal documents to maintain your verified status.`,
      data: { entityId, timeframe },
      createdAt: new Date().toISOString(),
      read: false,
      priority: 'high'
    });
  }

  // Get verification documents for a request
  static async getVerificationDocuments(verificationRequestId: string): Promise<VerificationDocument[]> {
    return await githubDB.findMany(collections.verification_documents, { verificationRequestId });
  }

  // Upload verification document
  static async uploadVerificationDocument(
    verificationRequestId: string,
    file: File,
    documentType: VerificationDocument['documentType'],
    metadata: VerificationDocument['metadata'],
    uploadedBy: string
  ): Promise<VerificationDocument> {
    // Convert file to base64
    const base64Content = await this.fileToBase64(file);
    
    const document: VerificationDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      verificationRequestId,
      documentType,
      fileName: file.name,
      fileSize: file.size,
      base64Content,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      metadata
    };

    await githubDB.create(collections.verification_documents, document);
    return document;
  }

  // Helper: Convert file to base64
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:mime/type;base64, prefix
      };
      reader.onerror = error => reject(error);
    });
  }
}

export default VerificationService;