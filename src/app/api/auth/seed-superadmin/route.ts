import { NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { seedDefaults } from '@/db/seed';
import { handleApiError } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Allow empty body POST request to trigger default seeding
    }

    const {
      email = 'superadmin@saas-toi.com',
      name = 'Super Admin SaaS',
      password = 'SuperAdmin123!',
    } = body as { email?: string; name?: string; password?: string };

    // 1. Seed base default organization and plans
    await seedDefaults();

    // 2. Create or promote Super Admin user
    const superAdmin = await AuthService.createSuperAdmin({
      email,
      name,
      password,
    });

    return NextResponse.json({
      success: true,
      message: 'Cuenta de Super Usuario inicializada correctamente',
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
      credentialsHint: {
        email: superAdmin.email,
        password: password,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
