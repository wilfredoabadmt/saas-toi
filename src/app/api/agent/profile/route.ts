import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionContext } from '@/lib/auth';
import { assertTenantScope } from '@/lib/tenant';
import { handleApiError } from '@/lib/api-errors';
import { db } from '@/db/client';
import { agentProfile } from '@/db/schema/chatbot';
import { isAiConfigured } from '@/lib/ai';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function newId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const orgId = assertTenantScope(session.organizationId);

    const rows = await db
      .select()
      .from(agentProfile)
      .where(eq(agentProfile.organizationId, orgId))
      .limit(1);

    let p = rows[0];
    if (!p) {
      const created = await db
        .insert(agentProfile)
        .values({
          id: newId('agp'),
          organizationId: orgId,
          enabled: false,
        })
        .onConflictDoNothing({ target: agentProfile.organizationId })
        .returning();

      p =
        created[0] ??
        (
          await db
            .select()
            .from(agentProfile)
            .where(eq(agentProfile.organizationId, orgId))
            .limit(1)
        )[0];
    }

    if (!p) {
      return NextResponse.json({ error: 'No se pudo crear el perfil del agente' }, { status: 500 });
    }

    return NextResponse.json({
      profile: {
        enabled: p.enabled,
        name: p.name,
        tone: p.tone,
        instructions: p.instructions,
        escalationRules: p.escalationRules,
        greeting: p.greeting,
        paymentInstructions: p.paymentInstructions,
        allowPaymentPromise: p.allowPaymentPromise,
        allowTicketCreation: p.allowTicketCreation,
        allowReceiptCapture: p.allowReceiptCapture,
        maxPromiseDays: p.maxPromiseDays,
      },
      aiConfigured: isAiConfigured(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const putSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(60).optional(),
  tone: z.string().max(500).nullable().optional(),
  instructions: z.string().max(8000).nullable().optional(),
  escalationRules: z.string().max(4000).nullable().optional(),
  greeting: z.string().max(1000).nullable().optional(),
  paymentInstructions: z.string().max(2000).nullable().optional(),
  allowPaymentPromise: z.boolean().optional(),
  allowTicketCreation: z.boolean().optional(),
  allowReceiptCapture: z.boolean().optional(),
  maxPromiseDays: z.number().int().min(1).max(30).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    const orgId = assertTenantScope(session.organizationId);

    const body = await request.json();
    const validatedData = putSchema.parse(body);

    const updated = await db
      .update(agentProfile)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(agentProfile.organizationId, orgId))
      .returning();

    if (!updated[0]) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
