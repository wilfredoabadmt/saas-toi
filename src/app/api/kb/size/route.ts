import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getSessionContext } from '@/lib/auth';
import { assertTenantScope } from '@/lib/tenant';
import { handleApiError } from '@/lib/api-errors';
import { db, ensureMigrationsRun } from '@/db/client';
import { kbEntry } from '@/db/schema/chatbot';
import { renderKb } from '@/server/ai/prompts';

export const dynamic = 'force-dynamic';

const WARN_CHARS = 24_000;

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

    const chars = renderKb(entries).length;

    return NextResponse.json({
      chars,
      warnAt: WARN_CHARS,
      warning: chars >= WARN_CHARS,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
