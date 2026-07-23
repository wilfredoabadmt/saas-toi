import { describe, it, expect, vi, beforeEach } from 'vitest';

// Drizzle delete chain: db.delete(table).where(...).returning(...)
const { mockReturning, mockWhere, mockDelete } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
  return { mockReturning, mockWhere, mockDelete };
});

vi.mock('@/db/client', () => ({
  db: { delete: mockDelete },
}));

vi.mock('@/db/schema/processed-events', () => ({
  processedWebhookEvents: {
    receivedAt: 'received_at',
    id: 'id',
  },
}));

vi.mock('drizzle-orm', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

import { purgeExpiredWebhookEvents } from '@/lib/cleanup';

describe('purgeExpiredWebhookEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });
  });

  it('should delete expired events and return count', async () => {
    mockReturning.mockResolvedValue([{ id: '1' }, { id: '2' }]);

    const deleted = await purgeExpiredWebhookEvents(7);

    expect(deleted).toBe(2);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
  });

  it('should return 0 when no expired events exist', async () => {
    mockReturning.mockResolvedValue([]);

    const deleted = await purgeExpiredWebhookEvents(7);

    expect(deleted).toBe(0);
  });

  it('should use custom retention days', async () => {
    mockReturning.mockResolvedValue([{ id: '1' }]);

    const deleted = await purgeExpiredWebhookEvents(30);

    expect(deleted).toBe(1);
    expect(mockDelete).toHaveBeenCalled();
  });
});
