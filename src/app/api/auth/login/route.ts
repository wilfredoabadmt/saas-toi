import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, ensureMigrationsRun } from '@/db/client';
import { users } from '@/db/schema/users';
import { organizations } from '@/db/schema/organizations';
import { eq } from 'drizzle-orm';
import { comparePasswords } from '@/lib/password';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { handleApiError } from '@/lib/api-errors';

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

export async function POST(req: NextRequest) {
  try {
    await ensureMigrationsRun();

    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos.', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const userResult = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        role: users.role,
        organizationId: users.organizationId,
        organizationStatus: organizations.status,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (userResult.length === 0 || !userResult[0].passwordHash) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    const user = userResult[0];
    const passwordMatch = await comparePasswords(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'El usuario no está asociado a ninguna organización.' }, { status: 403 });
    }

    if (user.role !== 'super_admin' && user.organizationStatus !== 'active' && user.organizationStatus !== 'trialing') {
      return NextResponse.json({ error: 'La cuenta de su organización no está activa.' }, { status: 403 });
    }

    const { cookieValue, expiresAt } = await createSession(
      user.id,
      user.organizationId,
      {
        ip: req.ip,
        userAgent: req.headers.get('user-agent') || undefined,
      }
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (err) {
    console.error('[AUTH LOGIN ERROR]:', (err as Error).message);
    return handleApiError(err);
  }
}
