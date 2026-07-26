import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionContext } from '@/lib/auth';
import { assertTenantScope } from '@/lib/tenant';
import { handleApiError } from '@/lib/api-errors';
import { db } from '@/db/client';
import { kbEntry } from '@/db/schema/chatbot';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  question: z.string().trim().min(1).max(500).optional(),
  answer: z.string().trim().min(1).max(4000).optional(),
  content: z.string().trim().min(1).max(8000).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionContext(request);
    const orgId = assertTenantScope(session.organizationId);

    const body = await request.json();
    const validatedData = patchSchema.parse(body);

    const updated = await db
      .update(kbEntry)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(and(eq(kbEntry.organizationId, orgId), eq(kbEntry.id, id)))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ entry: updated[0] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSessionContext(request);
    const orgId = assertTenantScope(session.organizationId);

    const deleted = await db
      .delete(kbEntry)
      .where(and(eq(kbEntry.organizationId, orgId), eq(kbEntry.id, id)))
      .returning();

    if (!deleted[0]) {
      return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
