import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '@/lib/rate-limiter';

describe('src/lib/rate-limiter.ts', () => {
  const orgId = 'org-test-rate-limit';

  beforeEach(() => {
    RateLimiter.reset(orgId);
  });

  it('should allow requests below the limit', () => {
    const limit = 3;
    expect(RateLimiter.tryConsume(orgId, limit)).toBe(true);
    expect(RateLimiter.tryConsume(orgId, limit)).toBe(true);
    expect(RateLimiter.tryConsume(orgId, limit)).toBe(true);
  });

  it('should reject requests exceeding the limit', () => {
    const limit = 2;
    expect(RateLimiter.tryConsume(orgId, limit)).toBe(true);
    expect(RateLimiter.tryConsume(orgId, limit)).toBe(true);
    expect(RateLimiter.tryConsume(orgId, limit)).toBe(false);
  });

  it('should isolate limits between different tenants', () => {
    const orgA = 'org-A';
    const orgB = 'org-B';
    const limit = 1;

    expect(RateLimiter.tryConsume(orgA, limit)).toBe(true);
    expect(RateLimiter.tryConsume(orgA, limit)).toBe(false);

    expect(RateLimiter.tryConsume(orgB, limit)).toBe(true);
  });
});
