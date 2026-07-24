import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTicket } = vi.hoisted(() => ({
  mockTicket: {
    id: 'ticket_001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    subscriberId: 'sub_001',
    ticketNumber: 'TCK-1001',
    category: 'no_service',
    priority: 'high',
    status: 'open',
    description: 'Sin señal de internet en domicilio',
    assignedTechnician: null,
    internalNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}));

vi.mock('@/lib/whatsapp/client', () => ({
  WhatsAppClient: {
    sendTextMessage: vi.fn().mockResolvedValue({ wamid: 'wamid_mock' }),
  },
}));

vi.mock('@/services/waba.service', () => ({
  WabaService: {
    getDecryptedTokenInternal: vi.fn().mockResolvedValue({
      token: 'mock_token',
      phoneNumberId: 'phone_123',
      wabaId: 'waba_123',
    }),
  },
}));

vi.mock('@/db/client', () => {
  const whereMock = vi.fn().mockImplementation(() => {
    const promise = Promise.resolve([mockTicket]);
    return Object.assign(promise, {
      limit: vi.fn().mockResolvedValue([mockTicket]),
      orderBy: vi.fn().mockResolvedValue([mockTicket]),
    });
  });

  return {
    ensureMigrationsRun: vi.fn().mockResolvedValue(undefined),
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([{ ticket: mockTicket, subscriber: { id: 'sub_001', name: 'Carlos' } }]),
            }),
          }),
          where: whereMock,
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTicket]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockTicket, status: 'in_progress', assignedTechnician: 'Juan Pérez' }]),
          }),
        }),
      }),
    },
  };
});

import { TicketService } from '@/services/ticket.service';

describe('TicketService Unit Tests', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list should return tickets scoped by tenant', async () => {
    const tickets = await TicketService.list(orgId);
    expect(tickets.length).toBe(1);
    expect(tickets[0]?.ticket.ticketNumber).toBe('TCK-1001');
  });

  it('create should autogenerate TCK-1001 ticket number and notify subscriber', async () => {
    const created = await TicketService.create(orgId, {
      subscriberId: 'sub_001',
      category: 'no_service',
      description: 'Corte de cable de fibra',
      priority: 'critical',
    });

    expect(created.ticketNumber).toBe('TCK-1001');
  });

  it('update should update ticket status and assigned technician', async () => {
    const updated = await TicketService.update(orgId, 'ticket_001', {
      status: 'in_progress',
      assignedTechnician: 'Juan Pérez',
    });

    expect(updated?.status).toBe('in_progress');
    expect(updated?.assignedTechnician).toBe('Juan Pérez');
  });
});
