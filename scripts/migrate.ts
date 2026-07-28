import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}

const runMigrations = async () => {
    console.log('Connecting to the database...');
    const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
    const db = drizzle(migrationClient);

    console.log('Running database migrations...');
    try {
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('✅ Migrations completed successfully.');
    } catch (error) {
        console.error('❌ Error running migrations:', error);
        process.exit(1);
    } finally {
        await migrationClient.end();
        console.log('Database connection closed.');
    }
};

runMigrations();