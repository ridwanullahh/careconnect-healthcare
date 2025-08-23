// Client-side encryption for BYOK (Bring Your Own Key) pattern
// Encrypts provider API keys and sensitive data before storing in GitHub DB

export class EncryptionService {
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
  }

  private static generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(12));
  }

  static async encrypt(plaintext: string, userSecret: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = this.generateSalt();
    const iv = this.generateIV();
    
    const key = await this.deriveKey(userSecret, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedData: string, userSecret: string): Promise<string> {
    const decoder = new TextDecoder();
    const combined = new Uint8Array([...atob(encryptedData)].map(c => c.charCodeAt(0)));
    
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await this.deriveKey(userSecret, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  }

  // Generate a secure user secret if one doesn't exist
  static generateUserSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
}

// Legacy compatibility functions for backward compatibility
const SECRET_KEY = 'careconnect-healthcare-2025';

export function encrypt(text: string): string {
  try {
    // Simple base64 encoding with key mixing
    const combined = text + '|' + SECRET_KEY;
    return btoa(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const decoded = atob(encryptedText);
    const [text] = decoded.split('|');
    return text;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}
