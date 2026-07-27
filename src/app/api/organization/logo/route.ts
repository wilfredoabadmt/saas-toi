import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth';
import { db, ensureMigrationsRun } from '@/db/client';
import { organizations } from '@/db/schema/organizations';
import { eq } from 'drizzle-orm';
import { handleApiError } from '@/lib/api-errors';

/**
 * GET /api/organization/logo
 * Returns current tenant organization logoUrl.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getSessionContext(request);
    await ensureMigrationsRun();

    const [org] = await db
      .select({ logoUrl: organizations.logoUrl })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    return NextResponse.json({ success: true, logoUrl: org?.logoUrl || null });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PATCH /api/organization/logo
 * Updates custom tenant organization logoUrl for branding.
 */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getSessionContext(request);
    await ensureMigrationsRun();

    const body = await request.json();
    const { logoUrl } = body;

    const [updated] = await db
      .update(organizations)
      .set({
        logoUrl: logoUrl ? String(logoUrl).trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, ctx.organizationId))
      .returning({ id: organizations.id, logoUrl: organizations.logoUrl });

    return NextResponse.json({
      success: true,
      message: 'Logo de la empresa ISP actualizado correctamente',
      logoUrl: updated?.logoUrl || null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
