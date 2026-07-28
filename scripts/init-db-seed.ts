import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hash } from 'bcryptjs';
import 'dotenv/config';

import * as schema from '../src/db/schema';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}

const db = drizzle(postgres(process.env.DATABASE_URL!), { schema });

const main = async () => {
    console.log('🌱 Starting database seeding...');

    // 1. Verificar si la base de datos ya tiene datos para evitar sobreescribir.
    const existingUsers = await db.query.users.findFirst();
    if (existingUsers) {
        console.log('✅ Database already seeded. Skipping.');
        return;
    }

    console.log('Database is empty. Proceeding with seeding...');

    // 2. Crear Planes Predeterminados
    console.log('Creating default SAAS plans...');
    const plans = await db
        .insert(schema.saasPlans)
        .values([
            {
                name: 'Starter',
                price: 29,
                features: ['500 Subscribers', '1 User', 'Basic Support'],
                isDefault: true,
            },
            {
                name: 'Pro',
                price: 79,
                features: [
                    '5000 Subscribers',
                    '10 Users',
                    'MikroTik Automation',
                    'Priority Support',
                ],
                isDefault: false,
            },
            {
                name: 'Enterprise',
                price: 199,
                features: ['Unlimited Subscribers', 'Unlimited Users', 'AI Chatbot', 'Dedicated Support'],
                isDefault: false,
            },
        ])
        .returning();
    const proPlan = plans.find((p) => p.name === 'Pro');
    if (!proPlan) {
        throw new Error('Pro plan not found after seeding.');
    }
    console.log('✅ SAAS plans created.');

    // 3. Crear Organización Demo
    console.log('Creating demo organization "FiberSpeed ISP"...');
    const [demoOrg] = await db
        .insert(schema.organizations)
        .values({
            name: 'FiberSpeed ISP',
            status: 'active',
        })
        .returning();
    console.log('✅ Demo organization created.');

    // 4. Asignar Plan Pro a la Organización Demo
    console.log('Assigning Pro plan to demo organization...');
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30-day trial

    await db.insert(schema.subscriptions).values({
        organizationId: demoOrg.id,
        planId: proPlan.id,
        status: 'active',
        trialEndsAt: trialEndDate,
    });
    console.log('✅ Pro plan assigned.');

    // 5. Crear Usuarios (Super Admin y Admin Demo) con contraseñas Bcrypt
    console.log('Creating Super Admin and Demo Admin users...');
    const hashedPasswordSuperAdmin = await hash('superadminpassword', 12);
    const hashedPasswordDemoAdmin = await hash('demopassword', 12);

    await db.insert(schema.users).values([
        {
            email: 'superadmin@saas-toi.com',
            name: 'Super Admin',
            passwordHash: hashedPasswordSuperAdmin,
            role: 'super_admin',
            // Super Admin no pertenece a ninguna organización
        },
        {
            email: 'admin@ispdemo.com',
            name: 'Demo Admin',
            passwordHash: hashedPasswordDemoAdmin,
            role: 'admin',
            organizationId: demoOrg.id,
        },
    ]);
    console.log('✅ Users created.');

    console.log('🎉 Database seeding completed successfully!');
};

main()
    .catch((e) => {
        console.error('❌ An error occurred during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        // Cierra la conexión si es necesario, aunque tsx la maneja.
    });