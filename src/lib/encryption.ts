// Simple encryption utilities for local storage
// Note: In production, use proper encryption libraries

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
