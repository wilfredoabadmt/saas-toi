import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { organizations } from '@/db/schema/organizations';
import { ApiError, handleApiError } from '@/lib/api-errors';
import { getSessionContext } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { organizationId } = await getSessionContext(req);

    const [org] = await db
      .select({ currency: organizations.currency })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return NextResponse.json({ currency: org?.currency || 'BOB' });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { organizationId } = await getSessionContext(req);
    const body = await req.json();
    const { currency } = body;

    if (!currency || !['BOB', 'USD', 'CLP'].includes(currency)) {
      throw new ApiError('VALIDATION_ERROR', 'Moneda no válida. Debe ser BOB (Bs.), USD ($) o CLP ($)', 400);
    }

    const [updated] = await db
      .update(organizations)
      .set({ currency, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();

    return NextResponse.json({ success: true, currency: updated?.currency || currency });
  } catch (err) {
    return handleApiError(err);
  }
}
