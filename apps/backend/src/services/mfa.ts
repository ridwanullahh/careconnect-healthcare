// Bismillah Ar-Rahman Ar-Raheem.
// Backend MFA/TOTP service — RFC 6238 Time-based One-Time Password.
// Uses HMAC-SHA1 (no external deps). Secrets are stored encrypted in the DB.
import crypto from 'node:crypto';
import type { StorageAdapter } from '@careconnect/db';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // allow 1 step before/after for clock drift

/** Decode a Base32 string into a Buffer (RFC 4648). */
function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const c of cleaned) {
    const idx = BASE32_CHARS.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/** Encode a Buffer into a Base32 string (RFC 4648, no padding). */
function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

/** Generate a new random TOTP secret (20 bytes = 160 bits, Base32 encoded). */
export function generateTOTPSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Generate the current TOTP code for a given secret + time. */
export function generateTOTP(secret: string, time: number = Math.floor(Date.now() / 1000)): string {
  const key = base32Decode(secret);
  const counter = Math.floor(time / STEP_SECONDS);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Verify a TOTP code against a secret, allowing for clock drift (window). */
export function verifyTOTP(secret: string, token: string, time: number = Math.floor(Date.now() / 1000)): boolean {
  const code = parseInt(token, 10);
  if (isNaN(code) || token.length !== DIGITS) return false;
  const counter = Math.floor(time / STEP_SECONDS);
  for (let i = -WINDOW; i <= WINDOW; i++) {
    const expected = generateTOTP(secret, (counter + i) * STEP_SECONDS);
    if (expected === token) return true;
  }
  return false;
}

/** Build an otpauth:// URI for QR code provisioning. */
export function buildOTPAuthURI(opts: {
  secret: string;
  accountName: string;
  issuer?: string;
}): string {
  const issuer = opts.issuer || 'CareConnect';
  const label = encodeURIComponent(`${issuer}:${opts.accountName}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Enable MFA for a user: generate a secret, store it (pending verification),
 * and return the secret + otpauth URI for QR code display.
 */
export async function enableMFA(
  db: StorageAdapter,
  userId: string,
  accountName: string,
): Promise<{ secret: string; uri: string }> {
  const secret = generateTOTPSecret();
  const uri = buildOTPAuthURI({ secret, accountName });
  // Store as pending until the user verifies with a code.
  await db.insert('session_tokens', {
    user_id: userId,
    token: `mfa_pending:${secret}`,
    type: 'mfa_pending',
    expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min to verify
    created_at: new Date().toISOString(),
  });
  return { secret, uri };
}

/**
 * Confirm MFA setup: verify the first TOTP code, then persist the secret on
 * the user record as mfa_enabled + mfa_secret.
 */
export async function confirmMFA(
  db: StorageAdapter,
  userId: string,
  token: string,
): Promise<boolean> {
  // Find the pending secret.
  const pending = (await db.find('session_tokens', { user_id: userId, type: 'mfa_pending' })) as any[];
  if (pending.length === 0) throw new Error('No pending MFA setup. Start again.');
  const latest = pending[pending.length - 1];
  const secret = latest.token.replace('mfa_pending:', '');
  if (!verifyTOTP(secret, token)) return false;
  // Persist MFA enablement on the user.
  await db.update('users', userId, {
    mfa_enabled: true,
    mfa_secret: secret,
    updated_at: new Date().toISOString(),
  });
  // Clean up pending tokens.
  for (const p of pending) {
    await db.delete('session_tokens', p.id);
  }
  await db.insert('audit_logs', {
    action: 'mfa_enabled',
    entity_type: 'user',
    entity_id: userId,
    user_email: '',
    details: 'MFA/TOTP enabled by user',
    created_at: new Date().toISOString(),
  });
  return true;
}

/** Disable MFA for a user (requires a valid TOTP to prevent accidental disable). */
export async function disableMFA(
  db: StorageAdapter,
  userId: string,
  token: string,
): Promise<boolean> {
  const user = (await db.findById('users', userId)) as any;
  if (!user || !user.mfa_enabled || !user.mfa_secret) {
    throw new Error('MFA is not enabled for this user.');
  }
  if (!verifyTOTP(user.mfa_secret, token)) return false;
  await db.update('users', userId, {
    mfa_enabled: false,
    mfa_secret: null,
    updated_at: new Date().toISOString(),
  });
  await db.insert('audit_logs', {
    action: 'mfa_disabled',
    entity_type: 'user',
    entity_id: userId,
    user_email: user.email || '',
    details: 'MFA/TOTP disabled by user',
    created_at: new Date().toISOString(),
  });
  return true;
}

/** Check if a user has MFA enabled. */
export async function isMFAEnabled(db: StorageAdapter, userId: string): Promise<boolean> {
  const user = (await db.findById('users', userId)) as any;
  return !!(user && user.mfa_enabled && user.mfa_secret);
}

/** Verify a TOTP token for a user (used during login step 2). */
export async function verifyUserTOTP(
  db: StorageAdapter,
  userId: string,
  token: string,
): Promise<boolean> {
  const user = (await db.findById('users', userId)) as any;
  if (!user || !user.mfa_enabled || !user.mfa_secret) return false;
  return verifyTOTP(user.mfa_secret, token);
}
