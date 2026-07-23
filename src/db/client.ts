import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/saas_toi';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

let migrationPromise: Promise<void> | null = null;

export async function ensureMigrationsRun() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');
        await migrate(db, { migrationsFolder });
      } catch (err) {
        migrationPromise = null;
        console.warn('[DB Auto-Migration Notice]:', (err as Error).message);
      }
    })();
  }
  return migrationPromise;
}

