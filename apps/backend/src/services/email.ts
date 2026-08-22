// Bismillah Ar-Rahman Ar-Raheem.
// Backend email service — sends transactional emails via Gmail REST API
// using an OAuth2 refresh token (no nodemailer, works on Cloudflare Pages/Workers).
// The client never sees credentials.
import crypto from 'node:crypto';
import type { StorageAdapter } from '@careconnect/db';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const GMAIL_FROM_EMAIL = process.env.GMAIL_FROM_EMAIL || 'careconnect@careconnect.health';
const EMAIL_ENABLED = !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);

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

// Cache the access token (expires in ~1h).
let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

/** Exchange the refresh token for a fresh access token via Google OAuth2. */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiry - 60000) {
    return cachedAccessToken;
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${data.error || data.error_description || res.status}`);
  }
  cachedAccessToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedAccessToken!;
}

/** Encode a raw RFC 2822 email message to base64url for the Gmail API. */
function encodeEmail(to: string, subject: string, html: string, text?: string): string {
  const lines = [
    `To: ${to}`,
    `From: CareConnect <${GMAIL_FROM_EMAIL}>`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ];
  if (text) {
    // Fallback: include plain text version in multipart (simplified — just use html).
  }
  const raw = lines.join('\r\n');
  // base64url encode
  return Buffer.from(raw, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Send an email immediately via Gmail REST API. Returns true on success. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!EMAIL_ENABLED) {
    console.log('[email] (dev) would send:', msg.to, '|', msg.subject);
    return true;
  }
  try {
    const accessToken = await getAccessToken();
    const raw = encodeEmail(msg.to, msg.subject, msg.html, msg.text);
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[email] Gmail send failed:', err.error?.message || res.status);
      return false;
    }
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

/** Whether email sending is enabled (Gmail credentials configured). */
export function isEmailEnabled(): boolean {
  return EMAIL_ENABLED;
}
