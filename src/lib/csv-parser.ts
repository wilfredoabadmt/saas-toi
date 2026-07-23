import Papa from 'papaparse';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema/subscribers';
import { assertTenantScope } from '@/lib/tenant';
import { calculatePaymentStatus } from '@/services/subscriber.service';
import { z } from 'zod';
import { phoneSchema } from './validators';

export interface CsvImportRow {
  nombre?: string;
  telefono?: string;
  plan?: string;
  monto?: string | number;
  fecha_vencimiento?: string;
}

export interface CsvImportResult {
  imported: number;
  duplicates: number;
  errors: Array<{ row: number; reason: string }>;
  total: number;
}

const csvRowSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  telefono: phoneSchema,
  monto: z.coerce.number().positive('Monto debe ser un número positivo'),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD'),
});

export async function parseAndImportSubscribersCsv(
  organizationId: string,
  csvText: string
): Promise<CsvImportResult> {
  const orgId = assertTenantScope(organizationId);

  const parsed = Papa.parse<CsvImportRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const errors: Array<{ row: number; reason: string }> = [];
  const validRows: Array<{
    organizationId: string;
    name: string;
    phone: string;
    monthlyAmount: string;
    dueDate: string;
    paymentStatus: string;
  }> = [];

  parsed.data.forEach((row, index) => {
    const rowNum = index + 2; // header is row 1
    const validation = csvRowSchema.safeParse({
      nombre: row.nombre?.trim(),
      telefono: row.telefono?.trim(),
      monto: row.monto,
      fecha_vencimiento: row.fecha_vencimiento?.trim(),
    });

    if (!validation.success) {
      const issueMsgs = validation.error.issues.map((i) => i.message).join(', ');
      errors.push({ row: rowNum, reason: issueMsgs });
      return;
    }

    const data = validation.data;
    validRows.push({
      organizationId: orgId,
      name: data.nombre,
      phone: data.telefono,
      monthlyAmount: data.monto.toFixed(2),
      dueDate: data.fecha_vencimiento,
      paymentStatus: calculatePaymentStatus(data.fecha_vencimiento),
    });
  });

  let imported = 0;
  let duplicates = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    
    // Batch insert with ON CONFLICT DO NOTHING for (phone, organization_id)
    const inserted = await db
      .insert(subscribers)
      .values(batch)
      .onConflictDoNothing({
        target: [subscribers.phone, subscribers.organizationId],
      })
      .returning({ id: subscribers.id });

    imported += inserted.length;
    duplicates += batch.length - inserted.length;
  }

  return {
    imported,
    duplicates,
    errors,
    total: parsed.data.length,
  };
}
