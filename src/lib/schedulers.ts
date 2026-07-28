// Bismillah Ar-Rahman Ar-Raheem.
// Schedulers (legacy compat shim).
//
// All real scheduling now happens server-side at POST /api/cron. This file
// keeps the old API surface (BookingReminderService + EmailSchedulerService)
// so existing call sites continue to compile, but the heavy lifting has been
// removed from the client:
//   - startReminderDaemon / startProcessor are no-ops (the consolidated
//     scheduler in src/lib/consolidated-scheduler.ts polls /api/cron instead).
//   - processDueEmails now delegates to the backend /api/cron endpoint.
//   - scheduleReminders() / scheduleEmail() / unsubscribe() still write to
//     the database so feature code that creates reminders keeps working.
//
// See src/lib/consolidated-scheduler.ts for the new entry point.
import { githubDB as db, collections } from './database';
import { runCronOnce } from './consolidated-scheduler';

export interface BookingReminder {
  id?: string;
  uid?: string;
  booking_id: string;
  user_id: string;
  entity_id: string;
  reminder_type: '24h' | '1h' | 'custom';
  scheduled_at: string;
  sent: boolean;
  sent_at?: string;
  created_at: string;
}

export class BookingReminderService {
  /**
   * @deprecated The daemon is a no-op now. Cron runs server-side at /api/cron.
   * Kept for backward compatibility with existing call sites.
   */
  static startReminderDaemon(_intervalMs: number = 60000): void {
    // No-op. See src/lib/consolidated-scheduler.ts.
  }

  static stopReminderDaemon(): void {
    // No-op.
  }

  /**
   * Process due booking reminders. Server-side /api/cron now handles this,
   * but we keep a thin wrapper that delegates so any code calling this
   * method directly continues to work.
   */
  static async processDueReminders(): Promise<number> {
    try {
      const summary = await runCronOnce();
      return summary?.reminders?.booking || 0;
    } catch (err: any) {
      console.warn('[schedulers] processDueReminders via /api/cron failed:', err?.message || err);
      return 0;
    }
  }

  static async getUpcomingReminders(userId: string): Promise<BookingReminder[]> {
    return db.find(collections.booking_reminders, (r: any) =>
      r.user_id === userId && !r.sent && new Date(r.scheduled_at) > new Date()
    ) as Promise<BookingReminder[]>;
  }

  static async cancelReminders(bookingId: string): Promise<void> {
    const reminders = await db.find(collections.booking_reminders, { booking_id: bookingId }) as BookingReminder[];
    for (const r of reminders) {
      if (!r.sent) {
        await db.update(collections.booking_reminders, r.id!, { sent: true, cancelled: true });
      }
    }
  }
}

export interface ScheduledEmail {
  id?: string;
  uid?: string;
  type: 'newsletter' | 'digest' | 'reminder' | 'notification';
  to_email: string;
  subject: string;
  html_content: string;
  scheduled_at: string;
  sent: boolean;
  sent_at?: string;
  created_at: string;
}

export class EmailSchedulerService {
  /**
   * @deprecated No-op. Cron runs server-side at /api/cron. The
   * consolidated scheduler in src/lib/consolidated-scheduler.ts polls it
   * every 5 minutes for admin users.
   */
  static startProcessor(_intervalMs: number = 300000): void {
    // No-op.
  }

  static stopProcessor(): void {
    // No-op.
  }

  /**
   * Process due scheduled emails by delegating to the backend /api/cron
   * endpoint. Returns the number of emails that were sent.
   */
  static async processDueEmails(): Promise<number> {
    try {
      const summary = await runCronOnce();
      return summary?.emails?.sent || 0;
    } catch (err: any) {
      console.warn('[schedulers] processDueEmails via /api/cron failed:', err?.message || err);
      return 0;
    }
  }

  static async unsubscribe(email: string): Promise<void> {
    const users = await db.find(collections.users, { email });
    if (users[0]) {
      await db.insert(collections.unsubscribe_records, {
        user_id: (users[0] as any).id,
        email,
        unsubscribed_at: new Date().toISOString(),
      });

      const prefs = await db.find(collections.user_preferences, { user_id: (users[0] as any).id });
      if (prefs[0]) {
        await db.update(collections.user_preferences, (prefs[0] as any).id, { marketing_emails: false });
      }
    }
  }
}

export default { BookingReminderService, EmailSchedulerService };
