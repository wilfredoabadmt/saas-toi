import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from '@/lib/crypto';

describe('src/lib/crypto.ts', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  it('should encrypt and decrypt a string correctly', () => {
    const originalText = 'EAAG...meta_system_user_token...xyz';
    const encrypted = encrypt(originalText);

    expect(encrypted).toBeTypeOf('string');
    expect(encrypted).not.toBe(originalText);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should generate different IVs and ciphertexts for identical inputs', () => {
    const text = 'SAME_SECRET_TOKEN';
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);

    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(text);
    expect(decrypt(enc2)).toBe(text);
  });

  it('should throw an error if decrypting invalid format', () => {
    expect(() => decrypt('invalid-format')).toThrow();
  });
});
