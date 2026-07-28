import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/saas_toi';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

let migrationPromise: Promise<void> | null = null;

export async function ensureMigrationsRun() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const path = await import('path');
          const { migrate } = await import('drizzle-orm/node-postgres/migrator');
          const migrationsFolder = path.join(process.cwd(), 'src/db/migrations');
          await migrate(db, { migrationsFolder });

          const { seedDefaults } = await import('./seed');
          await seedDefaults(db);
          return;
        } catch (err) {
          console.error(`[DB Auto-Migration Notice] Attempt ${attempt}/${maxRetries} failed:`, err);
          if (attempt === maxRetries) {
            console.warn('[DB Auto-Migration Notice] Max retries reached; continuing request processing.');
            return;
          }
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    })();
  }
  return migrationPromise;
}

