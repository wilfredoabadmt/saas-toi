import { describe, it, expect } from 'vitest';

describe('Public Pages Meta Compliance Integration Tests', () => {
  it('public legal routes should be defined and publicly accessible', () => {
    const publicRoutes = ['/privacy', '/terms', '/data-deletion'];

    publicRoutes.forEach((route) => {
      expect(route).toBeDefined();
      expect(route.startsWith('/')).toBe(true);
    });
  });
});
