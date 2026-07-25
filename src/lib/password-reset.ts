import { githubDB as db, collections } from './database';
import { encrypt, decrypt } from './encryption';

export interface PasswordResetToken {
  id?: string;
  uid?: string;
  user_id: string;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

const RESET_TOKEN_EXPIRY_HOURS = 1;

export class PasswordResetService {
  static async createResetToken(email: string): Promise<{ token: string; expires_at: string }> {
    const users = await db.find(collections.users, { email });
    if (users.length === 0) throw new Error('No account found with this email address');

    const user = users[0] as any;

    const existingTokens = await db.find(collections.session_tokens, (t: any) =>
      t.user_id === user.id && t.type === 'password_reset' && !t.used && new Date(t.expires_at) > new Date()
    );
    for (const t of existingTokens) {
      await db.update(collections.session_tokens, t.id, { used: true });
    }

    const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const token = encrypt(rawToken);
    const expires_at = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    await db.insert(collections.session_tokens, {
      user_id: user.id,
      email: user.email,
      token,
      type: 'password_reset',
      expires_at,
      used: false,
      created_at: new Date().toISOString(),
    });

    return { token: rawToken, expires_at };
  }

  static async verifyResetToken(token: string): Promise<{ valid: boolean; user_id: string; email: string }> {
    const encryptedToken = encrypt(token);
    const tokens = await db.find(collections.session_tokens, (t: any) =>
      t.type === 'password_reset' && !t.used && new Date(t.expires_at) > new Date()
    ) as PasswordResetToken[];

    const match = tokens.find(t => t.token === encryptedToken);
    if (!match) return { valid: false, user_id: '', email: '' };

    return { valid: true, user_id: (match as any).user_id, email: (match as any).email };
  }

  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');

    const verification = await this.verifyResetToken(token);
    if (!verification.valid) throw new Error('Invalid or expired reset token');

    const encoder = new TextEncoder();
    const data = encoder.encode(newPassword);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const password_hash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    await db.update(collections.users, verification.user_id, {
      password_hash,
      updated_at: new Date().toISOString(),
    });

    const encryptedToken = encrypt(token);
    const tokens = await db.find(collections.session_tokens, (t: any) =>
      t.token === encryptedToken && t.type === 'password_reset'
    );
    for (const t of tokens) {
      await db.update(collections.session_tokens, t.id, { used: true });
    }

    try {
      await db.insert(collections.notifications, {
        user_id: verification.user_id,
        type: 'security',
        title: 'Password Changed',
        message: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch {}

    return true;
  }

  static generateResetURL(token: string, baseURL: string = window.location.origin): string {
    return `${baseURL}/reset-password?token=${token}`;
  }
}

export default PasswordResetService;
