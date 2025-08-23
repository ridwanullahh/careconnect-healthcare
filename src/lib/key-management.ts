// BYOK (Bring Your Own Key) Management System
import { githubDB, collections } from './database';
import { EncryptionService } from './encryption';
import { useAuth } from './auth';

export enum KeyType {
  GEMINI_AI = 'gemini_ai',
  GOOGLE_MAPS = 'google_maps', 
  STRIPE = 'stripe',
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
  RAZORPAY = 'razorpay',
  PAYPAL = 'paypal'
}

export interface EncryptedKey {
  id: string;
  user_id: string;
  entity_id?: string; // For entity-scoped keys
  key_type: KeyType;
  encrypted_value: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
  rate_limit?: number;
  quota_remaining?: number;
  is_active: boolean;
}

export class KeyManagementService {
  private static getUserSecret(): string {
    let secret = localStorage.getItem('careconnect_user_secret');
    if (!secret) {
      secret = EncryptionService.generateUserSecret();
      localStorage.setItem('careconnect_user_secret', secret);
    }
    return secret;
  }

  static async storeKey(
    keyType: KeyType, 
    apiKey: string, 
    userId: string, 
    entityId?: string,
    rateLimit?: number
  ): Promise<void> {
    const userSecret = this.getUserSecret();
    const encryptedValue = await EncryptionService.encrypt(apiKey, userSecret);
    
    const keyData: Partial<EncryptedKey> = {
      user_id: userId,
      entity_id: entityId,
      key_type: keyType,
      encrypted_value: encryptedValue,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      rate_limit: rateLimit,
      quota_remaining: rateLimit,
      is_active: true
    };

    // Check if key already exists
    const existing = await githubDB.find(collections.encrypted_keys, {
      user_id: userId,
      entity_id: entityId || null,
      key_type: keyType
    });

    if (existing.length > 0) {
      await githubDB.update(collections.encrypted_keys, existing[0].id, {
        encrypted_value: encryptedValue,
        updated_at: new Date().toISOString(),
        rate_limit: rateLimit,
        quota_remaining: rateLimit
      });
    } else {
      await githubDB.insert(collections.encrypted_keys, keyData);
    }

    // Log key storage
    await this.logKeyAction(userId, keyType, 'stored');
  }

  static async getKey(keyType: KeyType, userId: string, entityId?: string): Promise<string | null> {
    try {
      const keys = await githubDB.find(collections.encrypted_keys, {
        user_id: userId,
        entity_id: entityId || null,
        key_type: keyType,
        is_active: true
      });

      if (keys.length === 0) return null;

      const key = keys[0];
      
      // Check rate limits
      if (key.rate_limit && key.quota_remaining <= 0) {
        throw new Error(`API quota exceeded for ${keyType}`);
      }

      const userSecret = this.getUserSecret();
      const decryptedKey = await EncryptionService.decrypt(key.encrypted_value, userSecret);

      // Update usage count
      await githubDB.update(collections.encrypted_keys, key.id, {
        usage_count: key.usage_count + 1,
        quota_remaining: key.quota_remaining ? key.quota_remaining - 1 : undefined,
        updated_at: new Date().toISOString()
      });

      return decryptedKey;
    } catch (error) {
      console.error('Failed to retrieve key:', error);
      return null;
    }
  }

  static async listKeys(userId: string, entityId?: string): Promise<Omit<EncryptedKey, 'encrypted_value'>[]> {
    const keys = await githubDB.find(collections.encrypted_keys, {
      user_id: userId,
      entity_id: entityId || null,
      is_active: true
    });

    return keys.map(key => ({
      id: key.id,
      user_id: key.user_id,
      entity_id: key.entity_id,
      key_type: key.key_type,
      created_at: key.created_at,
      updated_at: key.updated_at,
      usage_count: key.usage_count,
      rate_limit: key.rate_limit,
      quota_remaining: key.quota_remaining,
      is_active: key.is_active
    }));
  }

  static async deleteKey(keyId: string, userId: string): Promise<void> {
    const key = await githubDB.findById(collections.encrypted_keys, keyId);
    if (!key || key.user_id !== userId) {
      throw new Error('Unauthorized key deletion attempt');
    }

    await githubDB.update(collections.encrypted_keys, keyId, {
      is_active: false,
      updated_at: new Date().toISOString()
    });

    await this.logKeyAction(userId, key.key_type, 'deleted');
  }

  static async refreshQuota(keyId: string, userId: string, newQuota: number): Promise<void> {
    const key = await githubDB.findById(collections.encrypted_keys, keyId);
    if (!key || key.user_id !== userId) {
      throw new Error('Unauthorized key update attempt');
    }

    await githubDB.update(collections.encrypted_keys, keyId, {
      rate_limit: newQuota,
      quota_remaining: newQuota,
      updated_at: new Date().toISOString()
    });
  }

  private static async logKeyAction(userId: string, keyType: KeyType, action: string): Promise<void> {
    await githubDB.insert(collections.audit_logs, {
      user_id: userId,
      action: `key_${action}`,
      target: keyType,
      timestamp: new Date().toISOString(),
      ip_address: 'client',
      user_agent: navigator.userAgent
    });
  }

  // Validate key format before storage
  static validateKeyFormat(keyType: KeyType, apiKey: string): boolean {
    const patterns = {
      [KeyType.GEMINI_AI]: /^AIza[0-9A-Za-z\-_]{35}$/,
      [KeyType.GOOGLE_MAPS]: /^AIza[0-9A-Za-z\-_]{35}$/,
      [KeyType.STRIPE]: /^(sk_test_|sk_live_)[0-9A-Za-z]{24,}$/,
      [KeyType.PAYSTACK]: /^(sk_test_|sk_live_)[0-9a-f]{32}$/,
      [KeyType.FLUTTERWAVE]: /^FLWSECK_TEST-[0-9a-f]{32}-X$/,
      [KeyType.RAZORPAY]: /^rzp_(test_|live_)[0-9A-Za-z]{14}$/,
      [KeyType.PAYPAL]: /^[A-Z0-9\-_.]{80,}$/
    };

    return patterns[keyType]?.test(apiKey) || false;
  }
}