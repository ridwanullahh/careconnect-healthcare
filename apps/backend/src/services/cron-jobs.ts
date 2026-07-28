// Bismillah Ar-Rahman Ar-Raheem.
// Cron job helpers — booking reminders, re-verification reminders, and
// newsletter processing. Each returns a small summary that the /api/cron
// endpoint can aggregate and return to the caller.
//
// All scheduling works by creating `scheduled_emails` rows that
// `email.ts -> processDueEmails` will pick up on the next tick. This keeps a
// single delivery path (the email service) and avoids sending mail directly
// from cron.
import type { StorageAdapter } from '@careconnect/db';
import { scheduleEmail } from './email.ts';

export interface CronSummary {
  emails: { sent: number; failed: number };
  reminders: { booking: number; verification: number; newsletter: number };
  errors: string[];
}

/**
 * Booking reminders: find bookings whose appointment is within the next 24h
 * and for which no 24h reminder has been sent yet. For each, schedule an email
 * to the patient and mark `reminder_24h_sent = true`.
 *
 * Supports both `booking_date` (YYYY-MM-DD) + `start_time` (ISO) and the
 * legacy `appointment_date` field by treating either as the appointment time.
 */
export async function processBookingReminders(db: StorageAdapter): Promise<{ scheduled: number; errors: string[] }> {
  const errors: string[] = [];
  let scheduled = 0;

  let bookings: any[] = [];
  try {
    bookings = await db.find('bookings', {});
  } catch (err: any) {
    errors.push(`bookings fetch failed: ${err.message}`);
    return { scheduled, errors };
  }

  const now = Date.now();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  for (const booking of bookings) {
    try {
      if (!booking || booking.status === 'cancelled') continue;
      if (booking.reminder_24h_sent) continue;

      // Determine appointment time (ms since epoch).
      let apptMs: number | null = null;
      if (booking.start_time) {
        const t = new Date(booking.start_time).getTime();
        if (!Number.isNaN(t)) apptMs = t;
      }
      if (apptMs === null && booking.appointment_date) {
        const t = new Date(booking.appointment_date).getTime();
        if (!Number.isNaN(t)) apptMs = t;
      }
      if (apptMs === null && booking.booking_date) {
        // booking_date may be YYYY-MM-DD; combine with start_time-of-day if present.
        const t = new Date(booking.booking_date).getTime();
        if (!Number.isNaN(t)) apptMs = t;
      }
      if (apptMs === null) continue;

      const delta = apptMs - now;
      // Window: appointment is in the future and within the next 24h.
      if (delta < 0 || delta > twentyFourHoursMs) continue;

      // Resolve the patient's email.
      let email: string | undefined =
        booking.patient_email || booking.customer_email || booking.email;
      let patientName: string =
        booking.patient_name || booking.customer_name || 'Patient';

      if (!email && booking.user_id) {
        try {
          const user = await db.findById('users', booking.user_id);
          if (user?.email) email = user.email;
          if (user) {
            const profiles = await db.find('profiles', { user_id: booking.user_id });
            const p = profiles[0];
            if (p?.first_name || p?.last_name) {
              patientName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            }
          }
        } catch (err: any) {
          errors.push(`lookup user ${booking.user_id}: ${err.message}`);
        }
      }
      if (!email) continue;

      const entityName = booking.entity_name || booking.provider_name || 'your healthcare provider';
      const serviceName = booking.service_name || 'your appointment';
      const apptDateStr = new Date(apptMs).toLocaleString();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #047857;">Appointment Reminder</h2>
          <p>Dear ${patientName},</p>
          <p>This is a friendly reminder for your upcoming appointment:</p>
          <ul>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Provider:</strong> ${entityName}</li>
            <li><strong>When:</strong> ${apptDateStr}</li>
          </ul>
          <p>Please arrive 10 minutes early. If you need to reschedule, please contact the provider as soon as possible.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            Sent by CareConnect.
          </p>
        </div>
      `;

      await scheduleEmail(db, {
        to: email,
        subject: `Reminder: ${serviceName} at ${entityName}`,
        html,
        text: `Reminder: ${serviceName} at ${entityName} on ${apptDateStr}.`,
        scheduled_for: new Date().toISOString(),
      });

      await db.update('bookings', booking.id, {
        reminder_24h_sent: true,
        updated_at: new Date().toISOString(),
      });

      scheduled++;
    } catch (err: any) {
      errors.push(`booking ${booking?.id}: ${err.message}`);
    }
  }

  return { scheduled, errors };
}

/**
 * Re-verification reminders: for every verified entity_verification record
 * with an `expiresAt`, send reminders at 30, 7, and 1 day(s) before expiry.
 * Tracks which reminders have been sent via `reminders.{thirtyDays,sevenDays,oneDay}`.
 */
export async function processVerificationReminders(db: StorageAdapter): Promise<{ scheduled: number; errors: string[] }> {
  const errors: string[] = [];
  let scheduled = 0;

  let verifications: any[] = [];
  try {
    verifications = await db.find('entity_verification', { status: 'verified' });
  } catch (err: any) {
    errors.push(`entity_verification fetch failed: ${err.message}`);
    return { scheduled, errors };
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const v of verifications) {
    try {
      if (!v || !v.expiresAt) continue;
      const expiry = new Date(v.expiresAt).getTime();
      if (Number.isNaN(expiry)) continue;

      const daysUntilExpiry = Math.ceil((expiry - now) / dayMs);
      const reminders = v.reminders || {};

      const marks: Array<{ key: 'thirtyDays' | 'sevenDays' | 'oneDay'; days: number; label: string }> = [
        { key: 'thirtyDays', days: 30, label: '30 days' },
        { key: 'sevenDays', days: 7, label: '7 days' },
        { key: 'oneDay', days: 1, label: '1 day' },
      ];

      let updated = false;
      for (const m of marks) {
        if (daysUntilExpiry <= m.days && daysUntilExpiry > 0 && !reminders[m.key]) {
          // Resolve entity + a contact email.
          let email: string | undefined;
          let entityName = 'your entity';
          try {
            const entity = await db.findById('entities', v.entityId);
            if (entity) {
              entityName = entity.name || entityName;
              email = entity.email;
            }
          } catch (err: any) {
            errors.push(`entity lookup ${v.entityId}: ${err.message}`);
          }
          // Fallback to the submitting user's email if entity has none.
          if (!email && v.submittedBy) {
            try {
              const u = await db.findById('users', v.submittedBy);
              if (u?.email) email = u.email;
            } catch {}
          }
          if (!email) continue;

          const expiryStr = new Date(expiry).toLocaleDateString();
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #047857;">Verification Expiry Reminder</h2>
              <p>Dear ${entityName} team,</p>
              <p>Your CareConnect verification expires on <strong>${expiryStr}</strong> (in ${m.label}).</p>
              <p>To maintain your verified badge and continue appearing in verified searches, please submit a re-verification request before the expiry date.</p>
              <p style="margin-top: 16px;"><a href="/dashboard/entity/verification" style="background:#047857;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Start re-verification</a></p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">Sent by CareConnect.</p>
            </div>
          `;
          await scheduleEmail(db, {
            to: email,
            subject: `Verification expires in ${m.label} - ${entityName}`,
            html,
            text: `Your CareConnect verification for ${entityName} expires on ${expiryStr} (in ${m.label}). Please submit a re-verification request.`,
            scheduled_for: new Date().toISOString(),
          });
          reminders[m.key] = new Date().toISOString();
          scheduled++;
          updated = true;
        }
      }

      if (updated) {
        await db.update('entity_verification', v.id, { reminders });
      }
    } catch (err: any) {
      errors.push(`verification ${v?.id}: ${err.message}`);
    }
  }

  return { scheduled, errors };
}

/**
 * Newsletter processing: any scheduled_emails with type 'newsletter' that are
 * pending and due will be picked up by `processDueEmails` in the email
 * service. This helper is a placeholder hook that could expand recipients /
 * personalize content. For now it just counts due newsletter emails so the
 * summary reflects them.
 */
export async function processNewsletterReminders(db: StorageAdapter): Promise<{ scheduled: number; errors: string[] }> {
  const errors: string[] = [];
  let scheduled = 0;
  try {
    const now = new Date().toISOString();
    const due = await db.find('scheduled_emails', { status: 'pending', type: 'newsletter' });
    scheduled = due.filter((e: any) => e.scheduled_for <= now).length;
  } catch (err: any) {
    errors.push(`newsletter check failed: ${err.message}`);
  }
  return { scheduled, errors };
}
