import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
  let dbStatus = 'disconnected';

  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'connected';
  } catch (err) {
    console.error('[Health Check DB error]:', err);
  }

  return NextResponse.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
}
