import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getSessionContext } from '@/lib/auth';
import { assertTenantScope } from '@/lib/tenant';
import { handleApiError } from '@/lib/api-errors';
import { db, ensureMigrationsRun } from '@/db/client';
import { kbEntry } from '@/db/schema/chatbot';

export const dynamic = 'force-dynamic';

function newId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    await ensureMigrationsRun();
    const session = await getSessionContext(request);
    const orgId = assertTenantScope(session.organizationId);

    const entries = await db
      .select()
      .from(kbEntry)
      .where(eq(kbEntry.organizationId, orgId))
      .orderBy(asc(kbEntry.createdAt));

    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('qa'),
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(4000),
  }),
  z.object({
    kind: z.literal('block'),
    content: z.string().trim().min(1).max(8000),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    await ensureMigrationsRun();
    const session = await getSessionContext(request);
    const orgId = assertTenantScope(session.organizationId);

    const body = await request.json();
    const validatedData = createSchema.parse(body);

    const inserted = await db
      .insert(kbEntry)
      .values({
        id: newId('kb'),
        organizationId: orgId,
        kind: validatedData.kind,
        question: validatedData.kind === 'qa' ? validatedData.question : null,
        answer: validatedData.kind === 'qa' ? validatedData.answer : null,
        content: validatedData.kind === 'block' ? validatedData.content : null,
      })
      .returning();

    if (!inserted[0]) {
      return NextResponse.json({ error: 'No se pudo crear el elemento de conocimiento' }, { status: 500 });
    }

    return NextResponse.json({ entry: inserted[0] }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
