import { describe, it, expect, vi } from 'vitest';
import { parseAndImportSubscribersCsv } from '@/lib/csv-parser';

// Mock DB insert
vi.mock('@/db/client', () => ({
  db: {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: 'sub-1' }],
        }),
      }),
    }),
  },
}));

describe('src/lib/csv-parser.ts', () => {
  it('should parse valid CSV data and report counts', async () => {
    const csvContent = `nombre,telefono,plan,monto,fecha_vencimiento
Juan Pérez,+5491155551234,Fibra 50,15000,2026-08-01
María García,+5491155555678,Fibra 100,20000,2026-08-15`;

    const result = await parseAndImportSubscribersCsv('00000000-0000-0000-0000-000000000001', csvContent);

    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should report invalid rows with reasons', async () => {
    const csvContent = `nombre,telefono,plan,monto,fecha_vencimiento
Juan Pérez,invalid_phone,Fibra 50,15000,2026-08-01
María García,+5491155555678,Fibra 100,invalid_monto,2026-08-15`;

    const result = await parseAndImportSubscribersCsv('00000000-0000-0000-0000-000000000001', csvContent);

    expect(result.total).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]?.row).toBe(2);
    expect(result.errors[1]?.row).toBe(3);
  });
});
