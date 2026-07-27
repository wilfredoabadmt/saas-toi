-- =====================================================================
-- AUDITORÍA DE ESQUEMA — Módulo WABA para SaaS TOI
-- =====================================================================
-- Ejecuta este script COMPLETO en tu Postgres (psql, Drizzle Studio,
-- pgAdmin o Supabase SQL Editor) ANTES de aplicar ninguna migración.
--
-- Es 100% de solo lectura. No modifica nada.
-- Copia la salida al reporte de AUDITORIA_PREVIA.md.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ¿Existen las tablas que el módulo necesita?
-- ---------------------------------------------------------------------
SELECT
    t.expected_table,
    (c.table_name IS NOT NULL)                         AS existe,
    COALESCE(c.table_schema, '-')                      AS esquema
FROM (VALUES
    ('organizations'),
    ('waba_configs'),
    ('message_logs'),
    ('subscribers')
) AS t(expected_table)
LEFT JOIN information_schema.tables c
       ON c.table_name = t.expected_table
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY t.expected_table;


-- ---------------------------------------------------------------------
-- 2. Columnas actuales de waba_configs / message_logs / subscribers
-- ---------------------------------------------------------------------
SELECT
    table_name,
    ordinal_position AS pos,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_name IN ('waba_configs', 'message_logs', 'subscribers', 'organizations')
ORDER BY table_name, ordinal_position;


-- ---------------------------------------------------------------------
-- 3. ¿Qué columnas REQUERIDAS por el módulo faltan?
--    (esta es la consulta clave — su salida te dice qué añade la migración)
-- ---------------------------------------------------------------------
WITH requeridas(tabla, columna, proposito) AS (
    VALUES
    -- waba_configs
    ('waba_configs', 'organization_id',         'Aislamiento multi-tenant (OBLIGATORIA)'),
    ('waba_configs', 'waba_id',                 'ID de la WhatsApp Business Account en Meta'),
    ('waba_configs', 'phone_number_id',         'ID del número emisor (clave del webhook)'),
    ('waba_configs', 'display_phone_number',    'Número legible +591...'),
    ('waba_configs', 'verified_name',           'Nombre verificado del negocio'),
    ('waba_configs', 'access_token_encrypted',  'Token largo cifrado AES-256-GCM'),
    ('waba_configs', 'business_id',             'ID del Business Manager (opcional)'),
    ('waba_configs', 'meta_user_id',            'ID del usuario Meta, para deauthorize'),
    ('waba_configs', 'webhook_verify_token',    'Token de verificación (puede ser global)'),
    ('waba_configs', 'connection_status',       'active | inactive | revoked | error'),
    ('waba_configs', 'is_active',               'Flag de conexión viva'),
    ('waba_configs', 'last_error',              'Último error devuelto por Meta'),
    ('waba_configs', 'last_synced_at',          'Última sincronización de activos'),
    ('waba_configs', 'created_at',              'Auditoría'),
    ('waba_configs', 'updated_at',              'Auditoría'),
    -- message_logs
    ('message_logs', 'organization_id',         'Aislamiento multi-tenant (OBLIGATORIA)'),
    ('message_logs', 'waba_config_id',          'FK a la conexión emisora'),
    ('message_logs', 'subscriber_id',           'FK opcional al abonado'),
    ('message_logs', 'message_id',              'wamid de Meta — clave de idempotencia'),
    ('message_logs', 'direction',               'inbound | outbound'),
    ('message_logs', 'recipient_phone',         'Destinatario / remitente E.164'),
    ('message_logs', 'template_name',           'Plantilla usada'),
    ('message_logs', 'message_text',            'Cuerpo del mensaje'),
    ('message_logs', 'status',                  'accepted|sent|delivered|read|failed|received'),
    ('message_logs', 'error_code',              'Código de error de Meta'),
    ('message_logs', 'error_title',             'Título del error'),
    ('message_logs', 'error_message',           'Detalle del error'),
    ('message_logs', 'raw_payload',             'JSONB del evento crudo'),
    ('message_logs', 'last_event_at',           'Timestamp del último evento'),
    ('message_logs', 'created_at',              'Auditoría'),
    ('message_logs', 'updated_at',              'Auditoría'),
    -- subscribers (solo lectura, no se modifica)
    ('subscribers',  'organization_id',         'Aislamiento multi-tenant'),
    ('subscribers',  'phone',                   'Teléfono destino — VERIFICAR NOMBRE REAL')
)
SELECT
    r.tabla,
    r.columna,
    r.proposito,
    CASE WHEN c.column_name IS NULL THEN '❌ FALTA' ELSE '✅ existe' END AS estado,
    c.data_type
FROM requeridas r
LEFT JOIN information_schema.columns c
       ON c.table_name  = r.tabla
      AND c.column_name = r.columna
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY r.tabla, (c.column_name IS NOT NULL), r.columna;


-- ---------------------------------------------------------------------
-- 4. Índices y constraints existentes (para no duplicar)
-- ---------------------------------------------------------------------
SELECT
    tablename  AS tabla,
    indexname  AS indice,
    indexdef   AS definicion
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND tablename IN ('waba_configs', 'message_logs')
ORDER BY tablename, indexname;


-- ---------------------------------------------------------------------
-- 5. ¿Hay RLS activo? (si usas Supabase o políticas propias)
-- ---------------------------------------------------------------------
SELECT
    n.nspname   AS esquema,
    c.relname   AS tabla,
    c.relrowsecurity  AS rls_habilitado,
    c.relforcerowsecurity AS rls_forzado
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('waba_configs', 'message_logs', 'subscribers')
  AND c.relkind = 'r';


-- ---------------------------------------------------------------------
-- 6. Volumen actual (para dimensionar la migración)
-- ---------------------------------------------------------------------
SELECT 'waba_configs' AS tabla, COUNT(*) AS filas FROM waba_configs
UNION ALL SELECT 'message_logs', COUNT(*) FROM message_logs
UNION ALL SELECT 'subscribers',  COUNT(*) FROM subscribers;
-- Si alguna tabla no existe, esta consulta falla: ejecútala por separado.


-- ---------------------------------------------------------------------
-- 7. Conexiones WABA huérfanas o duplicadas (si waba_configs ya tiene datos)
-- ---------------------------------------------------------------------
-- Descomenta solo si waba_configs ya existe con organization_id:
-- SELECT organization_id, phone_number_id, COUNT(*) AS conexiones
-- FROM waba_configs
-- GROUP BY organization_id, phone_number_id
-- HAVING COUNT(*) > 1;
