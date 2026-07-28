import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { handleApiError } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session?.userId || !session.organizationId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'No estás autenticado.' },
        { status: 401 }
      );
    }

    // Usar el ID de la sesión para buscar al usuario y su organización en la base de datos
    const [userData, orgData] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, session.userId) }),
      db.query.organizations.findFirst({ where: eq(organizations.id, session.organizationId) }),
    ]);

    if (!userData || !orgData) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Usuario u organización de sesión no encontrados.' },
        { status: 404 }
      );
    }

    // Retornamos los datos completos y seguros del usuario y su organización
    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      organizationId: orgData.id,
      organizationName: orgData.name,
    });
  } catch (error) {
    console.error('[API_ME_ERROR]', error);
    return handleApiError(error);
  }
}