import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth'; // Asumiendo que esta función ya existe y funciona

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      // Aunque el middleware debería bloquear esto, es una doble verificación.
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Retornamos los datos completos del usuario y su organización
    return NextResponse.json({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      organizationId: session.organization.id,
      organizationName: session.organization.name,
    });
  } catch (error) {
    console.error('[API_ME_ERROR]', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}