import { describe, it, expect } from 'vitest';
import { verifyMetaWebhookSignature } from '@/lib/whatsapp/webhook-verify';
import crypto from 'crypto';

describe('src/lib/whatsapp/webhook-verify.ts', () => {
  const secret = 'meta_app_secret_test_123';
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

  it('should return true for valid signature header', () => {
    const sigHex = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const header = `sha256=${sigHex}`;

    expect(verifyMetaWebhookSignature(body, header, secret)).toBe(true);
  });

  it('should return false for invalid signature', () => {
    const header = 'sha256=invalid_hex_signature';
    expect(verifyMetaWebhookSignature(body, header, secret)).toBe(false);
  });

  it('should return false if header or secret is missing', () => {
    expect(verifyMetaWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyMetaWebhookSignature(body, 'sha256=123', undefined)).toBe(false);
  });
});
