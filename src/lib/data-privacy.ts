import { githubDB as db, collections } from './database';

export interface DataExportRequest {
  id?: string;
  user_id: string;
  format: 'json' | 'csv';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data_types: string[];
  file_url?: string;
  requested_at: string;
  completed_at?: string;
  expires_at?: string;
}

export interface DataDeletionRequest {
  id?: string;
  user_id: string;
  reason?: string;
  status: 'pending' | 'grace_period' | 'processing' | 'completed' | 'cancelled';
  grace_period_ends?: string;
  requested_at: string;
  completed_at?: string;
}

const GRACE_PERIOD_DAYS = 30;

const USER_DATA_COLLECTIONS = [
  'users', 'profiles', 'bookings', 'orders', 'order_items',
  'course_enrollments', 'course_progress', 'certificates',
  'donations', 'causes', 'notifications', 'consents',
  'access_grants', 'forum_posts', 'forum_replies',
  'reviews', 'ratings', 'messages', 'chat_sessions',
  'patients', 'encounters', 'vitals', 'conditions',
  'allergies', 'medication_requests', 'lab_orders',
  'imaging_orders', 'care_plans', 'referrals',
];

export class DataPrivacyService {
  static async requestExport(userId: string, format: 'json' | 'csv' = 'json', dataTypes?: string[]): Promise<DataExportRequest> {
    const existing = await db.find(collections.data_export_requests, (r: any) =>
      r.user_id === userId && (r.status === 'pending' || r.status === 'processing')
    );
    if (existing.length > 0) throw new Error('An export request is already in progress');

    return db.insert(collections.data_export_requests, {
      user_id: userId,
      format,
      status: 'pending',
      data_types: dataTypes || USER_DATA_COLLECTIONS,
      requested_at: new Date().toISOString(),
    }) as Promise<DataExportRequest>;
  }

  static async processExport(requestId: string): Promise<{ data: any; format: string }> {
    const request = await db.findById(collections.data_export_requests, requestId) as DataExportRequest;
    if (!request) throw new Error('Export request not found');

    await db.update(collections.data_export_requests, requestId, { status: 'processing' });

    const exportData: Record<string, any[]> = {};
    const typesToExport = request.data_types || USER_DATA_COLLECTIONS;

    for (const col of typesToExport) {
      try {
        let items = await db.find(col, { user_id: request.user_id });
        if (items.length === 0) {
          items = await db.find(col, (item: any) =>
            item.user_id === request.user_id ||
            item.patient_id === request.user_id ||
            item.author === request.user_id
          );
        }
        if (items.length > 0) exportData[col] = items;
      } catch {}
    }

    await db.update(collections.data_export_requests, requestId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const format = request.format;
    if (format === 'csv') {
      return { data: this.toCSV(exportData), format: 'csv' };
    }
    return { data: exportData, format: 'json' };
  }

  static downloadExport(data: any, format: string, filename: string = 'careconnect-data'): void {
    let blob: Blob;
    let ext: string;

    if (format === 'csv') {
      blob = new Blob([data as string], { type: 'text/csv;charset=utf-8' });
      ext = 'csv';
    } else {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      ext = 'json';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async requestDeletion(userId: string, reason?: string): Promise<DataDeletionRequest> {
    const existing = await db.find(collections.data_deletion_requests, (r: any) =>
      r.user_id === userId && r.status !== 'completed' && r.status !== 'cancelled'
    );
    if (existing.length > 0) throw new Error('A deletion request is already in progress');

    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + GRACE_PERIOD_DAYS);

    return db.insert(collections.data_deletion_requests, {
      user_id: userId,
      reason: reason || '',
      status: 'grace_period',
      grace_period_ends: gracePeriodEnds.toISOString(),
      requested_at: new Date().toISOString(),
    }) as Promise<DataDeletionRequest>;
  }

  static async cancelDeletion(requestId: string): Promise<void> {
    await db.update(collections.data_deletion_requests, requestId, {
      status: 'cancelled',
    });
  }

  static async processDeletion(requestId: string): Promise<{ deletedCollections: string[] }> {
    const request = await db.findById(collections.data_deletion_requests, requestId) as DataDeletionRequest;
    if (!request) throw new Error('Deletion request not found');

    if (request.grace_period_ends && new Date(request.grace_period_ends) > new Date()) {
      throw new Error('Grace period has not expired');
    }

    await db.update(collections.data_deletion_requests, requestId, { status: 'processing' });

    const deletedCollections: string[] = [];

    for (const col of USER_DATA_COLLECTIONS) {
      try {
        const items = await db.find(col, (item: any) =>
          item.user_id === request.user_id ||
          item.patient_id === request.user_id ||
          item.author === request.user_id ||
          item.id === request.user_id
        );
        for (const item of items) {
          await db.delete(col, item.id);
        }
        if (items.length > 0) deletedCollections.push(col);
      } catch {}
    }

    await db.update(collections.data_deletion_requests, requestId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    return { deletedCollections };
  }

  static async processExpiredDeletions(): Promise<number> {
    const expired = await db.find(collections.data_deletion_requests, (r: any) =>
      r.status === 'grace_period' &&
      r.grace_period_ends &&
      new Date(r.grace_period_ends) <= new Date()
    ) as DataDeletionRequest[];

    let processed = 0;
    for (const req of expired) {
      try {
        await this.processDeletion(req.id!);
        processed++;
      } catch {}
    }
    return processed;
  }

  private static toCSV(data: Record<string, any[]>): string {
    const lines: string[] = [];
    for (const [collection, items] of Object.entries(data)) {
      if (items.length === 0) continue;
      lines.push(`# Collection: ${collection}`);
      const headers = Object.keys(items[0]);
      lines.push(headers.join(','));
      for (const item of items) {
        lines.push(headers.map(h => {
          const val = item[h];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(','));
      }
      lines.push('');
    }
    return lines.join('\n');
  }
}

export default DataPrivacyService;
