// PIPEDA-compliant Data Deletion Service
import { githubDB, collections } from './database';
import { logger } from './observability';

export enum DeletionStatus {
  REQUESTED = 'requested',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface DataDeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: DeletionStatus;
  reason?: string;
  completed_at?: string;
  retention_period_days: number; // Grace period before permanent deletion
  data_types: string[]; // Types of data to delete
}

export class DataDeletionService {
  private static readonly DEFAULT_RETENTION_DAYS = 30;
  
  static async requestDataDeletion(
    userId: string, 
    reason?: string,
    retentionDays: number = this.DEFAULT_RETENTION_DAYS
  ): Promise<string> {
    try {
      // Check if there's already a pending request
      const existingRequests = await githubDB.find(collections.audit_logs, {
        user_id: userId,
        action: 'data_deletion_requested',
        status: DeletionStatus.REQUESTED
      });

      if (existingRequests.length > 0) {
        throw new Error('Data deletion request already pending');
      }

      const deletionRequest: Partial<DataDeletionRequest> = {
        user_id: userId,
        requested_at: new Date().toISOString(),
        status: DeletionStatus.REQUESTED,
        reason,
        retention_period_days: retentionDays,
        data_types: [
          'profile',
          'health_tools_results',
          'bookings',
          'messages',
          'analytics_events',
          'encrypted_keys',
          'preferences'
        ]
      };

      const request = await githubDB.insert(collections.audit_logs, {
        user_id: userId,
        action: 'data_deletion_requested',
        target: 'user_data',
        timestamp: new Date().toISOString(),
        data: deletionRequest
      });

      // Mark user account for deletion
      await githubDB.update(collections.users, userId, {
        deletion_requested: true,
        deletion_request_date: new Date().toISOString(),
        account_status: 'pending_deletion'
      });

      await logger.info(
        'data_deletion_requested',
        'User requested data deletion',
        { retention_days: retentionDays, reason },
        userId
      );

      return request.id;
    } catch (error) {
      await logger.error(
        'data_deletion_request_failed',
        'Failed to process data deletion request',
        { error: error.message },
        userId
      );
      throw error;
    }
  }

  static async processDataDeletion(requestId: string): Promise<void> {
    try {
      const request = await githubDB.findById(collections.audit_logs, requestId);
      if (!request || request.action !== 'data_deletion_requested') {
        throw new Error('Invalid deletion request');
      }

      const userId = request.user_id;
      const deletionData = request.data as DataDeletionRequest;

      // Update status to in progress
      await githubDB.update(collections.audit_logs, requestId, {
        'data.status': DeletionStatus.IN_PROGRESS
      });

      // Check if retention period has passed
      const requestDate = new Date(deletionData.requested_at);
      const retentionEnd = new Date(requestDate.getTime() + deletionData.retention_period_days * 24 * 60 * 60 * 1000);
      const now = new Date();

      if (now < retentionEnd) {
        await logger.info(
          'data_deletion_pending',
          'Data deletion pending retention period',
          { retention_end: retentionEnd.toISOString() },
          userId
        );
        return;
      }

      // Start deletion process
      const deletionResults = await this.deleteUserData(userId, deletionData.data_types);

      // Update request status
      await githubDB.update(collections.audit_logs, requestId, {
        'data.status': DeletionStatus.COMPLETED,
        'data.completed_at': new Date().toISOString(),
        'data.deletion_results': deletionResults
      });

      await logger.info(
        'data_deletion_completed',
        'User data deletion completed',
        deletionResults,
        userId
      );

    } catch (error) {
      await githubDB.update(collections.audit_logs, requestId, {
        'data.status': DeletionStatus.FAILED,
        'data.error': error.message
      });

      await logger.error(
        'data_deletion_failed',
        'Data deletion process failed',
        { error: error.message, request_id: requestId }
      );
      throw error;
    }
  }

  private static async deleteUserData(userId: string, dataTypes: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const dataType of dataTypes) {
      try {
        switch (dataType) {
          case 'profile':
            await this.anonymizeUserProfile(userId);
            results.profile = 'anonymized';
            break;

          case 'health_tools_results':
            const toolResults = await githubDB.find(collections.tool_results, { user_id: userId });
            for (const result of toolResults) {
              await githubDB.delete(collections.tool_results, result.id);
            }
            results.health_tools_results = toolResults.length;
            break;

          case 'bookings':
            const bookings = await githubDB.find(collections.bookings, { patient_id: userId });
            for (const booking of bookings) {
              // Keep booking for provider records but anonymize user data
              await githubDB.update(collections.bookings, booking.id, {
                patient_name: 'DELETED_USER',
                patient_email: 'deleted@privacy.local',
                patient_phone: 'DELETED',
                notes: 'USER_DATA_DELETED'
              });
            }
            results.bookings = bookings.length;
            break;

          case 'messages':
            const messages = await githubDB.find(collections.messages, { user_id: userId });
            for (const message of messages) {
              await githubDB.delete(collections.messages, message.id);
            }
            results.messages = messages.length;
            break;

          case 'analytics_events':
            const events = await githubDB.find(collections.analytics_events, { user_id: userId });
            for (const event of events) {
              await githubDB.delete(collections.analytics_events, event.id);
            }
            results.analytics_events = events.length;
            break;

          case 'encrypted_keys':
            const keys = await githubDB.find(collections.encrypted_keys, { user_id: userId });
            for (const key of keys) {
              await githubDB.delete(collections.encrypted_keys, key.id);
            }
            results.encrypted_keys = keys.length;
            break;

          case 'preferences':
            const prefs = await githubDB.find(collections.user_preferences, { user_id: userId });
            for (const pref of prefs) {
              await githubDB.delete(collections.user_preferences, pref.id);
            }
            results.preferences = prefs.length;
            break;

          default:
            results[dataType] = 'unknown_type';
        }
      } catch (error) {
        results[dataType] = `error: ${error.message}`;
      }
    }

    return results;
  }

  private static async anonymizeUserProfile(userId: string): Promise<void> {
    // Instead of deleting the user record, anonymize it
    await githubDB.update(collections.users, userId, {
      email: `deleted_${Date.now()}@privacy.local`,
      first_name: 'DELETED',
      last_name: 'USER',
      phone: null,
      date_of_birth: null,
      address: null,
      emergency_contact: null,
      medical_history: null,
      is_active: false,
      account_status: 'deleted',
      deletion_completed: true,
      deletion_completed_at: new Date().toISOString()
    });
  }

  static async cancelDeletionRequest(userId: string): Promise<void> {
    try {
      const requests = await githubDB.find(collections.audit_logs, {
        user_id: userId,
        action: 'data_deletion_requested',
        'data.status': DeletionStatus.REQUESTED
      });

      for (const request of requests) {
        await githubDB.update(collections.audit_logs, request.id, {
          'data.status': 'cancelled',
          'data.cancelled_at': new Date().toISOString()
        });
      }

      // Restore user account status
      await githubDB.update(collections.users, userId, {
        deletion_requested: false,
        deletion_request_date: null,
        account_status: 'active'
      });

      await logger.info(
        'data_deletion_cancelled',
        'User cancelled data deletion request',
        {},
        userId
      );
    } catch (error) {
      await logger.error(
        'data_deletion_cancel_failed',
        'Failed to cancel data deletion request',
        { error: error.message },
        userId
      );
      throw error;
    }
  }

  static async getDeletionStatus(userId: string): Promise<DataDeletionRequest | null> {
    try {
      const requests = await githubDB.find(collections.audit_logs, {
        user_id: userId,
        action: 'data_deletion_requested'
      });

      if (requests.length === 0) return null;

      // Return the most recent request
      const latestRequest = requests.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      return latestRequest.data as DataDeletionRequest;
    } catch (error) {
      await logger.error(
        'data_deletion_status_failed',
        'Failed to get deletion status',
        { error: error.message },
        userId
      );
      return null;
    }
  }

  // Process all pending deletions (called by background job)
  static async processPendingDeletions(): Promise<void> {
    try {
      const pendingRequests = await githubDB.find(collections.audit_logs, {
        action: 'data_deletion_requested',
        'data.status': DeletionStatus.REQUESTED
      });

      await logger.info(
        'processing_pending_deletions',
        'Processing pending data deletion requests',
        { count: pendingRequests.length }
      );

      for (const request of pendingRequests) {
        try {
          await this.processDataDeletion(request.id);
        } catch (error) {
          await logger.error(
            'deletion_processing_error',
            'Error processing individual deletion request',
            { request_id: request.id, error: error.message }
          );
        }
      }
    } catch (error) {
      await logger.error(
        'pending_deletions_failed',
        'Failed to process pending deletions',
        { error: error.message }
      );
    }
  }

  // Export user data (PIPEDA right to data portability)
  static async exportUserData(userId: string): Promise<Record<string, any>> {
    try {
      const userData: Record<string, any> = {};

      // User profile
      const user = await githubDB.findById(collections.users, userId);
      if (user) {
        const { password_hash, ...safeUserData } = user;
        userData.profile = safeUserData;
      }

      // User preferences
      const preferences = await githubDB.find(collections.user_preferences, { user_id: userId });
      userData.preferences = preferences;

      // Health tool results
      const toolResults = await githubDB.find(collections.tool_results, { user_id: userId });
      userData.health_tool_results = toolResults;

      // Bookings
      const bookings = await githubDB.find(collections.bookings, { patient_id: userId });
      userData.bookings = bookings;

      // Messages
      const messages = await githubDB.find(collections.messages, { user_id: userId });
      userData.messages = messages;

      await logger.info(
        'data_export_completed',
        'User data export completed',
        { data_types: Object.keys(userData) },
        userId
      );

      return userData;
    } catch (error) {
      await logger.error(
        'data_export_failed',
        'Failed to export user data',
        { error: error.message },
        userId
      );
      throw error;
    }
  }
}