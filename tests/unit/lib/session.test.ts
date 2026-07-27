import { describe, it, expect } from 'vitest';
import { signToken, verifySessionToken, hashToken } from '@/lib/session';

describe('Session Unit Tests', () => {
  it('should sign a token and verify it correctly', async () => {
    const rawToken = 'test_token_1234567890abcdef';
    const cookieValue = await signToken(rawToken);

    expect(cookieValue).toContain('.');
    const verified = await verifySessionToken(cookieValue);
    expect(verified).toBe(rawToken);
  });

  it('should reject tampered or modified session cookies', async () => {
    const rawToken = 'test_token_1234567890abcdef';
    const cookieValue = await signToken(rawToken);

    // Tamper with signature
    const tampered = cookieValue.slice(0, -1) + (cookieValue.endsWith('a') ? 'b' : 'a');
    const verified = await verifySessionToken(tampered);

    expect(verified).toBeNull();
  });

  it('should return null for missing or malformed cookies', async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
    expect(await verifySessionToken('invalid_cookie_no_dot')).toBeNull();
  });

  it('should compute deterministic SHA-256 hash of token for DB storage', async () => {
    const rawToken = 'test_token_1234567890abcdef';
    const hash1 = await hashToken(rawToken);
    const hash2 = await hashToken(rawToken);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
