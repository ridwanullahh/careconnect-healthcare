import { githubDB as db, collections } from './database';

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
  private static intervalId: ReturnType<typeof setInterval> | null = null;

  static scheduleReminders(booking: any): void {
    const bookingDate = new Date(`${booking.date}T${booking.time}`);
    const reminders: Array<{ type: '24h' | '1h'; offset: number }> = [
      { type: '24h', offset: 24 * 60 * 60 * 1000 },
      { type: '1h', offset: 60 * 60 * 1000 },
    ];

    for (const r of reminders) {
      const scheduledAt = new Date(bookingDate.getTime() - r.offset);
      if (scheduledAt > new Date()) {
        db.insert(collections.booking_reminders, {
          booking_id: booking.id,
          user_id: booking.user_id,
          entity_id: booking.entity_id,
          reminder_type: r.type,
          scheduled_at: scheduledAt.toISOString(),
          sent: false,
          created_at: new Date().toISOString(),
        }).catch(() => {});
      }
    }
  }

  static startReminderDaemon(intervalMs: number = 60000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processDueReminders(), intervalMs);
    console.log('Booking reminder daemon started');
  }

  static stopReminderDaemon(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  static async processDueReminders(): Promise<number> {
    const now = new Date();
    const dueReminders = await db.find(collections.booking_reminders, (r: any) =>
      !r.sent && new Date(r.scheduled_at) <= now
    ) as BookingReminder[];

    let processed = 0;
    for (const reminder of dueReminders) {
      try {
        const booking = await db.findById(collections.bookings, reminder.booking_id) as any;
        if (!booking || booking.status === 'cancelled') continue;

        await db.insert(collections.notifications, {
          user_id: reminder.user_id,
          type: 'booking_reminder',
          title: 'Upcoming Appointment',
          message: `Reminder: Your ${booking.service_name || 'appointment'} is ${reminder.reminder_type === '24h' ? 'tomorrow' : 'in 1 hour'} at ${booking.time}`,
          link: `/book/${reminder.entity_id}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });

        await db.update(collections.booking_reminders, reminder.id!, {
          sent: true,
          sent_at: new Date().toISOString(),
        });

        processed++;
      } catch {}
    }
    return processed;
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
  private static intervalId: ReturnType<typeof setInterval> | null = null;

  static async scheduleEmail(params: Omit<ScheduledEmail, 'id' | 'uid' | 'sent' | 'created_at'>): Promise<ScheduledEmail> {
    return db.insert(collections.scheduled_emails, {
      ...params,
      sent: false,
      created_at: new Date().toISOString(),
    }) as Promise<ScheduledEmail>;
  }

  static startProcessor(intervalMs: number = 300000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processDueEmails(), intervalMs);
  }

  static stopProcessor(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  static async processDueEmails(): Promise<number> {
    const now = new Date();
    const due = await db.find(collections.scheduled_emails, (e: any) =>
      !e.sent && new Date(e.scheduled_at) <= now
    ) as ScheduledEmail[];

    let processed = 0;
    for (const email of due) {
      try {
        const user = await db.find(collections.users, { email: email.to_email });
        if (user[0]) {
          const prefs = await db.find(collections.user_preferences, { user_id: (user[0] as any).id });
          const pref = prefs[0] as any;
          if (pref && pref.marketing_emails === false && email.type === 'newsletter') {
            await db.update(collections.scheduled_emails, email.id!, { sent: true, skipped: true, reason: 'unsubscribed' });
            continue;
          }
        }

        await db.update(collections.scheduled_emails, email.id!, {
          sent: true,
          sent_at: new Date().toISOString(),
        });
        processed++;
      } catch {}
    }
    return processed;
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
