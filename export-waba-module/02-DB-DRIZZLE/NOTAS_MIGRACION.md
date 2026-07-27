# 02 — Notas de migración

## Procedimiento seguro

```bash
# 1. BACKUP (no negociable)
pg_dump "$DATABASE_URL" -Fc -f backup-pre-waba-$(date +%Y%m%d-%H%M).dump

# 2. Ensayo en una copia
createdb saastoi_migration_test
pg_restore -d saastoi_migration_test backup-pre-waba-*.dump
psql -d saastoi_migration_test -f export-waba-module/02-DB-DRIZZLE/migration.sql

# 3. Revisa TODOS los NOTICE y WARNING de la salida.
#    Cada WARNING = algo que la migración decidió NO tocar por seguridad.

# 4. Solo si el ensayo está limpio, aplica en producción
psql "$DATABASE_URL" -f export-waba-module/02-DB-DRIZZLE/migration.sql
```

## Qué hace exactamente la migración

| Objeto | Acción | Destructivo |
|---|---|---|
| `waba_configs` | crea si no existe; si existe, solo `ADD COLUMN IF NOT EXISTS` | No |
| `message_logs` | crea si no existe; si existe, solo `ADD COLUMN IF NOT EXISTS` | No |
| `subscribers` | añade 4 columnas de opt-in | No |
| `waba_webhook_deadletter` | crea tabla nueva | No |
| Índices | `CREATE ... IF NOT EXISTS` | No |
| FKs | solo si no hay filas huérfanas; si las hay, avisa y omite | No |
| Defaults / backfill | dentro de subtransacciones con `EXCEPTION` | No |
| `NOT NULL` | **no se aplica** — queda como paso manual posterior | — |

**No hay ningún `DROP`, `RENAME` ni `ALTER TYPE` en todo el script.**

## Mensajes que esperas ver

```
NOTICE:  [WABA] Tipo detectado para organization_id: uuid
NOTICE:  [WABA] waba_configs ya existe: solo se añadirán columnas faltantes.
NOTICE:  [WABA] FK waba_configs→organizations creada.
NOTICE:  [WABA] Índice de idempotencia message_logs_message_id_uq listo.
NOTICE:  [WABA] ✅ Migración verificada correctamente.
```

## Warnings y qué hacer con cada uno

| Warning | Causa | Acción |
|---|---|---|
| `Hay message_id DUPLICADOS` | `message_logs` ya tiene wamids repetidos | Deduplica (SQL en el propio warning) y re-ejecuta. **Sin este índice el webhook duplica filas.** |
| `Hay waba_configs con organization_id huérfano` | Filas apuntando a orgs borradas | Asígnalas o bórralas, luego re-ejecuta para crear la FK |
| `No se pudo crear FK message_logs→subscribers` | Tipo de `subscribers.id` distinto de `uuid` | Cambia el tipo de `subscriber_id` en la migración y en el schema |
| `Omitido (revisar a mano): ALTER ... SET DEFAULT 'outbound'` | Tu columna es un `enum` | Añade el valor al enum o mapea en `column-map.ts` |

## Si tu `organization_id` NO es `uuid`

La migración lo detecta sola desde `organizations.id`. Pero el schema de Drizzle **no**:
edita `schema.waba.ts` y cambia en las dos tablas:

```ts
// uuid → text
organizationId: text('organization_id').notNull(),
// uuid → integer
organizationId: integer('organization_id').notNull(),
```

Y en `03-CORE/`, el tipo `OrganizationId` (definido en `tenant-context.ts`).

## Sobre `drizzle-kit`

Después de fusionar el schema:

```bash
npx drizzle-kit generate
```

**Lee el SQL generado antes de aplicarlo.** Drizzle desconoce las columnas que
la migración manual ya creó y puede proponer cambios redundantes o —peor— un
`DROP COLUMN` de algo tuyo que no declaraste en el schema.

Alternativa más segura si tu schema y tu DB ya divergen:

```bash
npx drizzle-kit pull      # introspecta la DB real y genera el schema desde ahí
```

## Si ya tenías datos en `waba_configs` con el token en claro

Script de cifrado retroactivo (ejecutar **una sola vez**, tras copiar `03-CORE/crypto.ts`):

```ts
// scripts/encrypt-existing-waba-tokens.ts
import { db } from '@/db';
import { wabaConfigs } from '@/db/schema/waba';
import { encryptSecret, isEncrypted } from '@/lib/waba/crypto';
import { eq, sql } from 'drizzle-orm';

const rows = await db.execute(sql`
    SELECT id, access_token, access_token_encrypted FROM waba_configs
`);

for (const row of rows as unknown as Array<{
    id: string; access_token: string | null; access_token_encrypted: string | null;
}>) {
    if (row.access_token_encrypted && isEncrypted(row.access_token_encrypted)) continue;
    const plain = row.access_token ?? row.access_token_encrypted;
    if (!plain) continue;

    await db.update(wabaConfigs)
        .set({ accessTokenEncrypted: encryptSecret(plain) })
        .where(eq(wabaConfigs.id, row.id));
    console.log(`cifrado ${row.id}`);
}
```

Después, y solo tras verificar que todo funciona:

```sql
ALTER TABLE public.waba_configs DROP COLUMN IF EXISTS access_token;
```

## Endurecimiento posterior (cuando todo esté verde)

```sql
ALTER TABLE public.waba_configs ALTER COLUMN organization_id        SET NOT NULL;
ALTER TABLE public.waba_configs ALTER COLUMN waba_id                SET NOT NULL;
ALTER TABLE public.waba_configs ALTER COLUMN phone_number_id        SET NOT NULL;
ALTER TABLE public.waba_configs ALTER COLUMN access_token_encrypted SET NOT NULL;
ALTER TABLE public.message_logs ALTER COLUMN organization_id        SET NOT NULL;
```

Verifica antes que no hay nulos:

```sql
SELECT COUNT(*) FROM waba_configs WHERE organization_id IS NULL
                                     OR access_token_encrypted IS NULL;
SELECT COUNT(*) FROM message_logs WHERE organization_id IS NULL;
```
