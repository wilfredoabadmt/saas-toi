import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'No hay sesión activa.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: session.userId,
        userName: session.userName,
        userEmail: session.userEmail,
        role: session.role,
        organizationId: session.organizationId,
        organizationName: session.organizationName,
        organizationStatus: session.organizationStatus,
        organizationLogoUrl: session.organizationLogoUrl || null,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error al obtener la sesión.';
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: errorMessage },
      { status: 500 }
    );
  }
}
