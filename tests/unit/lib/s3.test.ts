import { describe, it, expect } from 'vitest';
import { buildS3ProofKey } from '@/lib/s3';

describe('src/lib/s3.ts', () => {
  it('should build S3 proof key with proper organization isolation', () => {
    const orgId = 'org-123';
    const subId = 'sub-456';
    const filename = 'comprobante.jpg';

    const key = buildS3ProofKey(orgId, subId, filename);

    expect(key).toContain(`${orgId}/comprobantes/${subId}/`);
    expect(key).toContain(`_${filename}`);
  });
});
