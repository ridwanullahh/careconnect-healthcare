import { githubDB as db, collections } from './database';

export interface VerificationDocument {
  id?: string;
  uid?: string;
  entity_id: string;
  user_id: string;
  document_type: 'license' | 'accreditation' | 'registration' | 'insurance' | 'tax_clearance' | 'other';
  title: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  data_base64: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export class VerificationDocumentService {
  static async uploadDocument(
    entityId: string,
    userId: string,
    file: File,
    documentType: VerificationDocument['document_type'],
    title: string
  ): Promise<VerificationDocument> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Accepted: PDF, JPEG, PNG, WebP, DOC, DOCX.`);
    }

    const dataBase64 = await this.fileToBase64(file);

    const doc = await db.insert(collections.verification_documents, {
      entity_id: entityId,
      user_id: userId,
      document_type: documentType,
      title,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      data_base64: dataBase64,
      status: 'pending',
      uploaded_at: new Date().toISOString(),
    });

    await db.insert(collections.verification_queue, {
      entity_id: entityId,
      document_id: doc.id,
      type: 'document_review',
      status: 'pending',
      submitted_by: userId,
      submitted_at: new Date().toISOString(),
    });

    await db.update(collections.entities, entityId, {
      verification_status: 'documents_submitted',
      last_document_upload: new Date().toISOString(),
    });

    return doc as VerificationDocument;
  }

  static async getEntityDocuments(entityId: string): Promise<VerificationDocument[]> {
    return db.find(collections.verification_documents, { entity_id: entityId }) as Promise<VerificationDocument[]>;
  }

  static async getPendingDocuments(): Promise<VerificationDocument[]> {
    return db.find(collections.verification_documents, { status: 'pending' }) as Promise<VerificationDocument[]>;
  }

  static async reviewDocument(
    documentId: string,
    reviewerId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<void> {
    await db.update(collections.verification_documents, documentId, {
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || '',
    });

    const doc = await db.findById(collections.verification_documents, documentId) as any;
    if (doc) {
      const allDocs = await this.getEntityDocuments(doc.entity_id);
      const allReviewed = allDocs.every(d => d.status !== 'pending');
      const anyApproved = allDocs.some(d => d.status === 'approved');
      const anyRejected = allDocs.some(d => d.status === 'rejected');

      if (allReviewed) {
        let newStatus = 'pending';
        if (anyApproved && !anyRejected) newStatus = 'verified';
        else if (anyRejected) newStatus = 're_verify';

        await db.update(collections.entities, doc.entity_id, {
          verification_status: newStatus,
          verified_at: newStatus === 'verified' ? new Date().toISOString() : undefined,
        });
      }

      try {
        await db.insert(collections.notifications, {
          user_id: doc.user_id,
          type: 'verification',
          title: `Document ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your document "${doc.title}" has been ${status}. ${notes ? 'Notes: ' + notes : ''}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      } catch {}
    }
  }

  static downloadDocument(doc: VerificationDocument): void {
    const byteChars = atob(doc.data_base64.split(',')[1] || doc.data_base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: doc.mime_type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export default VerificationDocumentService;
