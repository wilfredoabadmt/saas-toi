import { z } from 'zod';

// E.164 phone format validator regex: starts with +, followed by 8-15 digits
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, {
    message: 'El teléfono debe estar en formato E.164 (ej: +5491155551234)',
  });

export const uuidSchema = z.string().uuid({ message: 'UUID inválido' });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
});

export const subscriberCreateSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  phone: phoneSchema,
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  servicePlanId: uuidSchema.optional().or(z.literal('')),
  monthlyAmount: z.coerce.number().positive('El monto debe ser un número positivo'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe estar en formato YYYY-MM-DD'),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const subscriberUpdateSchema = subscriberCreateSchema.partial();
