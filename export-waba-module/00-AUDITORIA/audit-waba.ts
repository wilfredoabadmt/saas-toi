/**
 * AUDITORÍA EJECUTABLE — Módulo WABA para SaaS TOI
 * ------------------------------------------------
 * Script de SOLO LECTURA. No modifica la base de datos ni el proyecto.
 *
 * Uso:
 *   npx tsx scripts/audit-waba.ts
 *   # o
 *   npx tsx export-waba-module/00-AUDITORIA/audit-waba.ts
 *
 * Requisitos: la variable DATABASE_URL debe estar en el entorno (o .env).
 * Funciona con `postgres` (postgres.js) o con `pg`. Detecta cuál tienes.
 *
 * Salida: un reporte legible + un JSON al final que puedes pegar en
 * AUDITORIA_PREVIA.md y pasarle al agente que hará la implementación.
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Definición de lo que el módulo necesita
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS: Record<string, string[]> = {
    waba_configs: [
        'organization_id',
        'waba_id',
        'phone_number_id',
        'display_phone_number',
        'verified_name',
        'access_token_encrypted',
        'business_id',
        'meta_user_id',
        'webhook_verify_token',
        'connection_status',
        'is_active',
        'last_error',
        'last_synced_at',
        'created_at',
        'updated_at',
    ],
    message_logs: [
        'organization_id',
        'waba_config_id',
        'subscriber_id',
        'message_id',
        'direction',
        'recipient_phone',
        'template_name',
        'message_text',
        'status',
        'error_code',
        'error_title',
        'error_message',
        'raw_payload',
        'last_event_at',
        'created_at',
        'updated_at',
    ],
    subscribers: ['organization_id'],
};

/** Nombres alternativos que ya podrías estar usando. Se reportan como "equivalente probable". */
const COLUMN_ALIASES: Record<string, string[]> = {
    access_token_encrypted: ['access_token', 'encrypted_access_token', 'token_encrypted', 'encrypted_token'],
    display_phone_number: ['phone_number', 'display_phone'],
    phone_number_id: ['phone_id', 'meta_phone_number_id'],
    waba_id: ['whatsapp_business_account_id', 'meta_waba_id'],
    message_id: ['wamid', 'meta_message_id', 'external_id'],
    recipient_phone: ['to_phone', 'phone', 'destination'],
    message_text: ['body', 'content', 'text'],
    last_event_at: ['sent_at', 'event_at'],
    raw_payload: ['payload', 'metadata', 'raw'],
    organization_id: ['org_id', 'tenant_id'],
    subscriber_id: ['abonado_id', 'customer_id'],
};

const REQUIRED_ENV = [
    'DATABASE_URL',
    'NEXT_PUBLIC_META_APP_ID',
    'META_APP_SECRET',
    'NEXT_PUBLIC_META_CONFIG_ID',
    'META_WEBHOOK_VERIFY_TOKEN',
    'WABA_ENCRYPTION_KEY',
    'NEXT_PUBLIC_APP_URL',
];

const OPTIONAL_ENV = ['META_GRAPH_VERSION', 'META_WEBHOOK_ENFORCE_SIGNATURE'];

// ---------------------------------------------------------------------------
// Conexión (detecta postgres.js o pg)
// ---------------------------------------------------------------------------

type QueryFn = (sql: string) => Promise<Record<string, unknown>[]>;

async function connect(): Promise<{ query: QueryFn; close: () => Promise<void> }> {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL no está definida en el entorno.');

    try {
        const mod = await import('postgres');
        const postgres = (mod.default ?? mod) as unknown as (u: string, o?: unknown) => {
            unsafe: (s: string) => Promise<Record<string, unknown>[]>;
            end: () => Promise<void>;
        };
        const sql = postgres(url, { max: 1, onnotice: () => {} });
        return {
            query: (text) => sql.unsafe(text),
            close: () => sql.end(),
        };
    } catch {
        // sigue al fallback
    }

    const pg = await import('pg');
    const Client = (pg.default ?? pg).Client;
    const client = new Client({ connectionString: url });
    await client.connect();
    return {
        query: async (text) => (await client.query(text)).rows,
        close: () => client.end(),
    };
}

// ---------------------------------------------------------------------------
// Utilidades de salida
// ---------------------------------------------------------------------------

const ok = (s: string) => `  ✅ ${s}`;
const bad = (s: string) => `  ❌ ${s}`;
const warn = (s: string) => `  ⚠️  ${s}`;
const head = (s: string) => `\n${'═'.repeat(72)}\n${s}\n${'═'.repeat(72)}`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const report: Record<string, unknown> = { generatedAt: new Date().toISOString() };

    console.log(head('AUDITORÍA WABA — SaaS TOI'));

    // -- 1. Entorno -----------------------------------------------------------
    console.log(head('1. VARIABLES DE ENTORNO'));
    const envReport: Record<string, boolean> = {};
    for (const key of REQUIRED_ENV) {
        const present = Boolean(process.env[key]);
        envReport[key] = present;
        console.log(present ? ok(`${key} definida`) : bad(`${key} FALTA (requerida)`));
    }
    for (const key of OPTIONAL_ENV) {
        const present = Boolean(process.env[key]);
        envReport[key] = present;
        console.log(present ? ok(`${key} definida`) : warn(`${key} ausente (opcional, hay default)`));
    }

    // Validación específica de la clave de cifrado
    const rawKey = process.env.WABA_ENCRYPTION_KEY;
    if (rawKey) {
        const bytes = /^[0-9a-fA-F]{64}$/.test(rawKey)
            ? 32
            : Buffer.from(rawKey, 'base64').length;
        console.log(
            bytes === 32
                ? ok('WABA_ENCRYPTION_KEY tiene 32 bytes (válida para AES-256-GCM)')
                : bad(`WABA_ENCRYPTION_KEY tiene ${bytes} bytes; AES-256-GCM requiere 32`)
        );
        report.encryptionKeyBytes = bytes;
    }
    report.env = envReport;

    // -- 2. Proyecto ----------------------------------------------------------
    console.log(head('2. ESTRUCTURA DEL PROYECTO'));
    const probes = [
        'drizzle.config.ts',
        'src/db/schema.ts',
        'src/db/schema/index.ts',
        'src/lib/db/schema.ts',
        'src/lib/waba',
        'src/app/api',
        'src/lib/crypto.ts',
        'src/lib/encryption.ts',
    ];
    const projectReport: Record<string, boolean> = {};
    for (const p of probes) {
        const exists = fs.existsSync(path.resolve(process.cwd(), p));
        projectReport[p] = exists;
        console.log(exists ? ok(`${p} presente`) : warn(`${p} no encontrado`));
    }
    console.log(
        projectReport['src/lib/crypto.ts'] || projectReport['src/lib/encryption.ts']
            ? warn('Ya existe una utilidad de cifrado → REUTILÍZALA en vez de 03-CORE/crypto.ts')
            : ok('Sin utilidad de cifrado previa → usa 03-CORE/crypto.ts tal cual')
    );
    report.project = projectReport;

    // -- 3. Base de datos -----------------------------------------------------
    console.log(head('3. ESQUEMA DE BASE DE DATOS'));

    let db: Awaited<ReturnType<typeof connect>> | null = null;
    try {
        db = await connect();
    } catch (error) {
        console.log(bad(`No se pudo conectar: ${(error as Error).message}`));
        console.log(warn('Ejecuta manualmente 00-AUDITORIA/audit-waba.sql y pega la salida.'));
        report.database = { connected: false };
        finish(report);
        return;
    }

    const tables = await db.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
    `);
    const tableNames = new Set(tables.map((r) => String(r.table_name)));

    const dbReport: Record<string, unknown> = { connected: true, tables: {} };

    for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
        console.log(`\n── Tabla: ${table}`);

        if (!tableNames.has(table)) {
            console.log(bad(`La tabla "${table}" NO existe. La migración la creará completa.`));
            (dbReport.tables as Record<string, unknown>)[table] = { exists: false };
            continue;
        }

        const cols = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = '${table}'
              AND table_schema NOT IN ('pg_catalog','information_schema')
        `);
        const present = new Set(cols.map((c) => String(c.column_name)));

        const missing: string[] = [];
        const aliased: Record<string, string> = {};

        for (const col of required) {
            if (present.has(col)) {
                console.log(ok(col));
                continue;
            }
            const alias = (COLUMN_ALIASES[col] ?? []).find((a) => present.has(a));
            if (alias) {
                aliased[col] = alias;
                console.log(warn(`${col} no existe, pero SÍ existe "${alias}" → mapear en column-map.ts`));
            } else {
                missing.push(col);
                console.log(bad(`${col} FALTA → la migración la añadirá`));
            }
        }

        const extra = [...present].filter(
            (c) => !required.includes(c) && !['id'].includes(c)
        );
        if (extra.length) {
            console.log(warn(`Columnas propias no usadas por el módulo (se respetan): ${extra.join(', ')}`));
        }

        (dbReport.tables as Record<string, unknown>)[table] = {
            exists: true,
            missing,
            aliased,
            extra,
            columns: cols,
        };
    }

    // Índices
    console.log('\n── Índices existentes');
    const idx = await db.query(`
        SELECT tablename, indexname, indexdef FROM pg_indexes
        WHERE tablename IN ('waba_configs','message_logs')
          AND schemaname NOT IN ('pg_catalog','information_schema')
    `);
    for (const row of idx) console.log(`  · ${row.tablename}.${row.indexname}`);
    const hasIdempotencyIndex = idx.some((r) =>
        String(r.indexdef).includes('message_id') && String(r.indexdef).includes('UNIQUE')
    );
    console.log(
        hasIdempotencyIndex
            ? ok('Ya hay índice UNIQUE sobre message_logs.message_id (idempotencia del webhook OK)')
            : bad('FALTA índice UNIQUE sobre message_logs.message_id → sin él el webhook duplicará filas')
    );
    dbReport.indexes = idx;
    dbReport.hasIdempotencyIndex = hasIdempotencyIndex;

    // RLS
    const rls = await db.query(`
        SELECT c.relname AS tabla, c.relrowsecurity AS rls
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname IN ('waba_configs','message_logs','subscribers') AND c.relkind='r'
    `);
    console.log('\n── Row Level Security');
    for (const row of rls) {
        console.log(row.rls ? warn(`${row.tabla}: RLS ACTIVO (Drizzle debe usar un rol que lo respete o bypass)`) : ok(`${row.tabla}: sin RLS (aislamiento por WHERE organization_id)`));
    }
    dbReport.rls = rls;

    report.database = dbReport;
    await db.close();
    finish(report);
}

function finish(report: Record<string, unknown>) {
    console.log(head('REPORTE JSON — pégalo en AUDITORIA_PREVIA.md'));
    console.log(JSON.stringify(report, null, 2));
    console.log(head('FIN'));
}

main().catch((error) => {
    console.error('\n❌ Auditoría fallida:', error);
    process.exit(1);
});
