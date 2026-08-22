// Bismillah Ar-Rahman Ar-Raheem.
// Email handler — Gmail REST API with OAuth2 refresh token.
// Works on Cloudflare Pages/Workers (fetch-based, no nodemailer).
import type { StorageAdapter } from './types';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ScheduledEmailRecord {
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

let cachedAccessToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(env: Record<string, string>): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiry - 60000) return cachedAccessToken;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Gmail token refresh failed: ${data.error || res.status}`);
  cachedAccessToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600) * 1000;
  return cachedAccessToken!;
}

function encodeEmail(to: string, subject: string, html: string, fromEmail: string): string {
  const raw = [
    `To: ${to}`, `From: CareConnect <${fromEmail}>`, `Subject: ${subject}`,
    'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', '', html,
  ].join('\r\n');
  return Buffer.from(raw, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendEmail(env: Record<string, string>, msg: EmailMessage): Promise<boolean> {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_REFRESH_TOKEN) {
    console.log('[email] (dev) would send:', msg.to, '|', msg.subject);
    return true;
  }
  try {
    const token = await getAccessToken(env);
    const raw = encodeEmail(msg.to, msg.subject, msg.html, env.GMAIL_FROM_EMAIL || 'careconnect@careconnect.health');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    return res.ok;
  } catch (err: any) {
    console.error('[email] send failed:', err.message);
    return false;
  }
}

export async function processDueEmails(db: StorageAdapter, env: Record<string, string>): Promise<{ sent: number; failed: number }> {
  const now = new Date().toISOString();
  let sent = 0, failed = 0;
  let offset = 0;
  for (;;) {
    const due = (await db.find('scheduled_emails', { status: 'pending' })) as ScheduledEmailRecord[];
    const toProcess = due.filter((e) => e.scheduled_for <= now).slice(offset, offset + 50);
    if (toProcess.length === 0) break;
    for (const email of toProcess) {
      const ok = await sendEmail(env, { to: email.to, subject: email.subject, html: email.html, text: email.text });
      await db.update('scheduled_emails', email.id, {
        status: ok ? 'sent' : 'failed',
        sent_at: ok ? new Date().toISOString() : undefined,
        error: ok ? undefined : 'Send failed',
      });
      if (ok) sent++; else failed++;
    }
    offset += 50;
    if (toProcess.length < 50) break;
  }
  return { sent, failed };
}
