import { NextResponse } from 'next/server';
import { db } from '@/db';
import { requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    await requireRole('super_admin');

    const tenants = await db.query.organizations.findMany({
      // Opcional: incluir datos relacionados como el plan actual
      with: {
        subscription: {
          with: {
            plan: true,
          },
        },
      },
      orderBy: (orgs, { desc }) => [desc(orgs.createdAt)],
    });

    return NextResponse.json(tenants);
  } catch (error: any) {
    console.error('[API_SUPER_ADMIN_TENANTS_ERROR]', error);
    return NextResponse.json({ error: 'No se pudieron cargar los tenants.' }, { status: 500 });
  }
}