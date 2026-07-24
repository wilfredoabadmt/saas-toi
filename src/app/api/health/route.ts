import { NextResponse } from 'next/server';
import { db, ensureMigrationsRun } from '@/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
  let dbStatus = 'disconnected';
  let migrationStatus = 'pending';

  try {
    // Run auto-migrations on first health check after deploy
    await ensureMigrationsRun();
    migrationStatus = 'applied';

    await db.execute(sql`SELECT 1`);
    dbStatus = 'connected';
  } catch (err) {
    console.error('[Health Check DB error]:', err);
    migrationStatus = 'failed';
  }

  return NextResponse.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: dbStatus,
    migrations: migrationStatus,
    timestamp: new Date().toISOString(),
  });
}

