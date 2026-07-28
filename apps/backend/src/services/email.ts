// Bismillah Ar-Rahman Ar-Raheem.
// Backend email service — sends transactional emails server-side.
// Supports SMTP (via nodemailer if installed) or a console log fallback for dev.
// The client never sees SMTP credentials.
import crypto from 'node:crypto';
import type { StorageAdapter } from '@careconnect/db';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT || '587';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'CareConnect <no-reply@careconnect.health>';
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true' || (!!SMTP_HOST && !!SMTP_USER);

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ScheduledEmailRecord {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error?: string;
  created_at: string;
}

/** Send an email immediately. Returns true on success. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!EMAIL_ENABLED) {
    console.log('[email] (dev) would send:', msg.to, '|', msg.subject);
    return true;
  }
  try {
    // Use nodemailer if available; otherwise log.
    const { default: nodemailer } = await import('nodemailer').catch(() => ({ default: null as any }));
    if (!nodemailer) {
      console.log('[email] nodemailer not installed; logging instead:', msg.to, '|', msg.subject);
      return true;
    }
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: SMTP_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return true;
  } catch (err: any) {
    console.error('[email] send failed:', err.message);
    return false;
  }
}

/** Schedule an email for later processing. */
export async function scheduleEmail(
  db: StorageAdapter,
  msg: EmailMessage & { scheduled_for: string },
): Promise<ScheduledEmailRecord> {
  const record: ScheduledEmailRecord = {
    id: `se_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    scheduled_for: msg.scheduled_for,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  await db.insert('scheduled_emails', record);
  return record;
}

/**
 * Process all due scheduled emails. Called by the cron endpoint.
 * Marks each as sent/failed with a timestamp.
 */
export async function processDueEmails(db: StorageAdapter): Promise<{ sent: number; failed: number }> {
  const now = new Date().toISOString();
  let sent = 0;
  let failed = 0;
  let offset = 0;
  const limit = 50;
  // Fetch pending due emails in pages.
  for (;;) {
    const due = (await db.find('scheduled_emails', { status: 'pending' })) as ScheduledEmailRecord[];
    const toProcess = due.filter((e) => e.scheduled_for <= now).slice(offset, offset + limit);
    if (toProcess.length === 0) break;
    for (const email of toProcess) {
      const ok = await sendEmail({ to: email.to, subject: email.subject, html: email.html, text: email.text });
      await db.update('scheduled_emails', email.id, {
        status: ok ? 'sent' : 'failed',
        sent_at: ok ? new Date().toISOString() : undefined,
        error: ok ? undefined : 'Send failed',
      });
      if (ok) sent++;
      else failed++;
    }
    offset += limit;
    if (toProcess.length < limit) break;
  }
  return { sent, failed };
}

/** Whether email sending is enabled (SMTP configured). */
export function isEmailEnabled(): boolean {
  return EMAIL_ENABLED;
}
