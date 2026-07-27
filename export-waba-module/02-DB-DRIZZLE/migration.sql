-- =====================================================================
-- MIGRACIÓN WABA — SaaS TOI
-- =====================================================================
-- 100% IDEMPOTENTE Y ADITIVA.
--   · No hace DROP de nada.
--   · No renombra columnas.
--   · No cambia tipos existentes.
--   · Se puede ejecutar N veces sin efecto adicional.
--
-- Detecta automáticamente el tipo de organizations.id para que
-- organization_id coincida (uuid / text / integer / bigint).
--
-- ⚠️ EJECUTAR SOLO DESPUÉS DE 00-AUDITORIA.
-- ⚠️ HAZ BACKUP: pg_dump antes de aplicar en producción.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Extensiones y helpers
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- Trigger genérico de updated_at (no pisa el tuyo si ya existe con otro nombre)
CREATE OR REPLACE FUNCTION waba_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 1. Detección del tipo de tenant
-- ---------------------------------------------------------------------
-- Guarda en una tabla temporal el tipo real de la PK de organizations,
-- para que organization_id se cree con el tipo correcto.
DO $$
DECLARE
    v_type TEXT;
BEGIN
    SELECT data_type INTO v_type
    FROM information_schema.columns
    WHERE table_name = 'organizations'
      AND column_name = 'id'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    LIMIT 1;

    IF v_type IS NULL THEN
        RAISE NOTICE '[WABA] Tabla "organizations" no encontrada. Se asumirá uuid para organization_id.';
        v_type := 'uuid';
    END IF;

    CREATE TEMP TABLE IF NOT EXISTS _waba_cfg (k TEXT PRIMARY KEY, v TEXT);
    INSERT INTO _waba_cfg (k, v) VALUES ('org_type', v_type)
    ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v;

    RAISE NOTICE '[WABA] Tipo detectado para organization_id: %', v_type;
END $$;


-- ---------------------------------------------------------------------
-- 2. Tabla waba_configs — crear si no existe
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_org_type TEXT;
BEGIN
    SELECT v INTO v_org_type FROM _waba_cfg WHERE k = 'org_type';

    IF to_regclass('public.waba_configs') IS NULL THEN
        RAISE NOTICE '[WABA] Creando tabla waba_configs.';
        EXECUTE format($fmt$
            CREATE TABLE public.waba_configs (
                id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id         %s NOT NULL,
                waba_id                 text NOT NULL,
                phone_number_id         text NOT NULL,
                display_phone_number    text,
                verified_name           text,
                business_id             text,
                meta_user_id            text,
                access_token_encrypted  text NOT NULL,
                token_type              text,
                token_expires_at        timestamptz,
                webhook_verify_token    text,
                connection_status       text NOT NULL DEFAULT 'active',
                is_active               boolean NOT NULL DEFAULT true,
                last_error              text,
                last_synced_at          timestamptz,
                created_at              timestamptz NOT NULL DEFAULT now(),
                updated_at              timestamptz NOT NULL DEFAULT now()
            )
        $fmt$, v_org_type);
    ELSE
        RAISE NOTICE '[WABA] waba_configs ya existe: solo se añadirán columnas faltantes.';
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3. waba_configs — añadir columnas faltantes (una por una, idempotente)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_org_type TEXT;
BEGIN
    SELECT v INTO v_org_type FROM _waba_cfg WHERE k = 'org_type';
    EXECUTE format(
        'ALTER TABLE public.waba_configs ADD COLUMN IF NOT EXISTS organization_id %s',
        v_org_type
    );
END $$;

ALTER TABLE public.waba_configs
    ADD COLUMN IF NOT EXISTS waba_id                text,
    ADD COLUMN IF NOT EXISTS phone_number_id        text,
    ADD COLUMN IF NOT EXISTS display_phone_number   text,
    ADD COLUMN IF NOT EXISTS verified_name          text,
    ADD COLUMN IF NOT EXISTS business_id            text,
    ADD COLUMN IF NOT EXISTS meta_user_id           text,
    ADD COLUMN IF NOT EXISTS access_token_encrypted text,
    ADD COLUMN IF NOT EXISTS token_type             text,
    ADD COLUMN IF NOT EXISTS token_expires_at       timestamptz,
    ADD COLUMN IF NOT EXISTS webhook_verify_token   text,
    ADD COLUMN IF NOT EXISTS connection_status      text,
    ADD COLUMN IF NOT EXISTS is_active              boolean,
    ADD COLUMN IF NOT EXISTS last_error             text,
    ADD COLUMN IF NOT EXISTS last_synced_at         timestamptz,
    ADD COLUMN IF NOT EXISTS created_at             timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at             timestamptz;

-- Defaults y backfill.
-- Envueltos en DO con EXCEPTION: si una columna preexistente es de otro tipo
-- (enum, varchar con check, etc.) el fallo queda contenido en su subtransacción
-- y NO aborta la migración completa.
DO $$
DECLARE
    stmt TEXT;
BEGIN
    FOREACH stmt IN ARRAY ARRAY[
        $s$ALTER TABLE public.waba_configs ALTER COLUMN connection_status SET DEFAULT 'active'$s$,
        $s$ALTER TABLE public.waba_configs ALTER COLUMN is_active         SET DEFAULT true$s$,
        $s$ALTER TABLE public.waba_configs ALTER COLUMN created_at        SET DEFAULT now()$s$,
        $s$ALTER TABLE public.waba_configs ALTER COLUMN updated_at        SET DEFAULT now()$s$,
        $s$UPDATE public.waba_configs SET connection_status = 'active' WHERE connection_status IS NULL$s$,
        $s$UPDATE public.waba_configs SET is_active         = true     WHERE is_active         IS NULL$s$,
        $s$UPDATE public.waba_configs SET created_at        = now()    WHERE created_at        IS NULL$s$,
        $s$UPDATE public.waba_configs SET updated_at        = now()    WHERE updated_at        IS NULL$s$
    ]
    LOOP
        BEGIN
            EXECUTE stmt;
        EXCEPTION WHEN others THEN
            RAISE WARNING '[WABA] Omitido (revisar a mano): % → %', stmt, SQLERRM;
        END;
    END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 4. waba_configs — FK a organizations (solo si es seguro)
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.organizations') IS NULL THEN
        RAISE NOTICE '[WABA] Sin tabla organizations: se omite la FK.';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'waba_configs_organization_id_fkey'
    ) THEN
        RAISE NOTICE '[WABA] FK waba_configs→organizations ya existe.';
        RETURN;
    END IF;

    -- No añadir la FK si hay filas huérfanas (rompería la migración)
    IF EXISTS (
        SELECT 1 FROM public.waba_configs w
        LEFT JOIN public.organizations o ON o.id::text = w.organization_id::text
        WHERE w.organization_id IS NOT NULL AND o.id IS NULL
    ) THEN
        RAISE WARNING '[WABA] Hay waba_configs con organization_id huérfano. FK OMITIDA. Límpialos y re-ejecuta.';
        RETURN;
    END IF;

    ALTER TABLE public.waba_configs
        ADD CONSTRAINT waba_configs_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

    RAISE NOTICE '[WABA] FK waba_configs→organizations creada.';
END $$;


-- ---------------------------------------------------------------------
-- 5. waba_configs — índices y unicidad multi-tenant
-- ---------------------------------------------------------------------
-- ⚠️ Clave: la unicidad INCLUYE organization_id.
-- Sin esto, un UPSERT de la organización B sobrescribe la conexión de A (ver GOTCHAS G-09).
CREATE UNIQUE INDEX IF NOT EXISTS waba_configs_org_waba_phone_uq
    ON public.waba_configs (organization_id, waba_id, phone_number_id);

-- Lookup del webhook: phone_number_id → tenant. Debe ser rápido.
CREATE INDEX IF NOT EXISTS waba_configs_phone_number_id_idx
    ON public.waba_configs (phone_number_id);

CREATE INDEX IF NOT EXISTS waba_configs_org_active_idx
    ON public.waba_configs (organization_id, is_active);

CREATE INDEX IF NOT EXISTS waba_configs_meta_user_id_idx
    ON public.waba_configs (meta_user_id)
    WHERE meta_user_id IS NOT NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS waba_configs_set_updated_at ON public.waba_configs;
CREATE TRIGGER waba_configs_set_updated_at
    BEFORE UPDATE ON public.waba_configs
    FOR EACH ROW EXECUTE FUNCTION waba_set_updated_at();


-- ---------------------------------------------------------------------
-- 6. Tabla message_logs — crear si no existe
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_org_type TEXT;
BEGIN
    SELECT v INTO v_org_type FROM _waba_cfg WHERE k = 'org_type';

    IF to_regclass('public.message_logs') IS NULL THEN
        RAISE NOTICE '[WABA] Creando tabla message_logs.';
        EXECUTE format($fmt$
            CREATE TABLE public.message_logs (
                id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id  %s NOT NULL,
                waba_config_id   uuid,
                subscriber_id    uuid,
                message_id       text,
                direction        text NOT NULL DEFAULT 'outbound',
                channel          text NOT NULL DEFAULT 'whatsapp',
                recipient_phone  text,
                template_name    text,
                template_language text,
                message_text     text,
                status           text NOT NULL DEFAULT 'accepted',
                error_code       text,
                error_title      text,
                error_message    text,
                raw_payload      jsonb,
                last_event_at    timestamptz DEFAULT now(),
                created_at       timestamptz NOT NULL DEFAULT now(),
                updated_at       timestamptz NOT NULL DEFAULT now()
            )
        $fmt$, v_org_type);
    ELSE
        RAISE NOTICE '[WABA] message_logs ya existe: solo se añadirán columnas faltantes.';
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 7. message_logs — añadir columnas faltantes
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_org_type TEXT;
BEGIN
    SELECT v INTO v_org_type FROM _waba_cfg WHERE k = 'org_type';
    EXECUTE format(
        'ALTER TABLE public.message_logs ADD COLUMN IF NOT EXISTS organization_id %s',
        v_org_type
    );
END $$;

ALTER TABLE public.message_logs
    ADD COLUMN IF NOT EXISTS waba_config_id    uuid,
    ADD COLUMN IF NOT EXISTS subscriber_id     uuid,
    ADD COLUMN IF NOT EXISTS message_id        text,
    ADD COLUMN IF NOT EXISTS direction         text,
    ADD COLUMN IF NOT EXISTS channel           text,
    ADD COLUMN IF NOT EXISTS recipient_phone   text,
    ADD COLUMN IF NOT EXISTS template_name     text,
    ADD COLUMN IF NOT EXISTS template_language text,
    ADD COLUMN IF NOT EXISTS message_text      text,
    ADD COLUMN IF NOT EXISTS status            text,
    ADD COLUMN IF NOT EXISTS error_code        text,
    ADD COLUMN IF NOT EXISTS error_title       text,
    ADD COLUMN IF NOT EXISTS error_message     text,
    ADD COLUMN IF NOT EXISTS raw_payload       jsonb,
    ADD COLUMN IF NOT EXISTS last_event_at     timestamptz,
    ADD COLUMN IF NOT EXISTS created_at        timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at        timestamptz;

-- Defaults y backfill, contenidos en subtransacciones (ver nota en waba_configs).
-- Si tu message_logs ya usa un enum para `status` o `direction`, el WARNING
-- te dirá exactamente qué ajustar a mano sin abortar la migración.
DO $$
DECLARE
    stmt TEXT;
BEGIN
    FOREACH stmt IN ARRAY ARRAY[
        $s$ALTER TABLE public.message_logs ALTER COLUMN direction     SET DEFAULT 'outbound'$s$,
        $s$ALTER TABLE public.message_logs ALTER COLUMN channel       SET DEFAULT 'whatsapp'$s$,
        $s$ALTER TABLE public.message_logs ALTER COLUMN status        SET DEFAULT 'accepted'$s$,
        $s$ALTER TABLE public.message_logs ALTER COLUMN last_event_at SET DEFAULT now()$s$,
        $s$ALTER TABLE public.message_logs ALTER COLUMN created_at    SET DEFAULT now()$s$,
        $s$ALTER TABLE public.message_logs ALTER COLUMN updated_at    SET DEFAULT now()$s$,
        $s$UPDATE public.message_logs SET channel   = 'whatsapp' WHERE channel   IS NULL$s$,
        $s$UPDATE public.message_logs SET direction = 'outbound' WHERE direction IS NULL$s$,
        $s$UPDATE public.message_logs SET last_event_at = COALESCE(created_at, now()) WHERE last_event_at IS NULL$s$,
        $s$UPDATE public.message_logs SET created_at = now() WHERE created_at IS NULL$s$,
        $s$UPDATE public.message_logs SET updated_at = now() WHERE updated_at IS NULL$s$
    ]
    LOOP
        BEGIN
            EXECUTE stmt;
        EXCEPTION WHEN others THEN
            RAISE WARNING '[WABA] Omitido (revisar a mano): % → %', stmt, SQLERRM;
        END;
    END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 8. message_logs — FKs opcionales
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.waba_configs') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_logs_waba_config_id_fkey')
       AND NOT EXISTS (
           SELECT 1 FROM public.message_logs m
           LEFT JOIN public.waba_configs w ON w.id = m.waba_config_id
           WHERE m.waba_config_id IS NOT NULL AND w.id IS NULL
       )
    THEN
        ALTER TABLE public.message_logs
            ADD CONSTRAINT message_logs_waba_config_id_fkey
            FOREIGN KEY (waba_config_id) REFERENCES public.waba_configs(id) ON DELETE SET NULL;
        RAISE NOTICE '[WABA] FK message_logs→waba_configs creada.';
    END IF;
EXCEPTION WHEN others THEN
    RAISE WARNING '[WABA] No se pudo crear FK message_logs→waba_configs: %', SQLERRM;
END $$;

DO $$
BEGIN
    IF to_regclass('public.subscribers') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'message_logs_subscriber_id_fkey')
       AND NOT EXISTS (
           SELECT 1 FROM public.message_logs m
           LEFT JOIN public.subscribers s ON s.id::text = m.subscriber_id::text
           WHERE m.subscriber_id IS NOT NULL AND s.id IS NULL
       )
    THEN
        ALTER TABLE public.message_logs
            ADD CONSTRAINT message_logs_subscriber_id_fkey
            FOREIGN KEY (subscriber_id) REFERENCES public.subscribers(id) ON DELETE SET NULL;
        RAISE NOTICE '[WABA] FK message_logs→subscribers creada.';
    END IF;
EXCEPTION WHEN others THEN
    RAISE WARNING '[WABA] No se pudo crear FK message_logs→subscribers (¿tipo de id distinto?): %', SQLERRM;
END $$;


-- ---------------------------------------------------------------------
-- 9. message_logs — índice de IDEMPOTENCIA (el más importante)
-- ---------------------------------------------------------------------
-- El webhook de Meta reenvía el mismo evento varias veces. Sin este índice,
-- ON CONFLICT no funciona y la tabla se llena de duplicados.
--
-- Es PARCIAL (WHERE message_id IS NOT NULL) para no romper filas
-- preexistentes de message_logs que no tengan wamid (p.ej. logs de SMS/email).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM (
            SELECT message_id FROM public.message_logs
            WHERE message_id IS NOT NULL
            GROUP BY message_id HAVING COUNT(*) > 1
        ) d
    ) THEN
        RAISE WARNING '[WABA] Hay message_id DUPLICADOS en message_logs. Índice único OMITIDO.';
        RAISE WARNING '[WABA] Limpia con: DELETE FROM message_logs a USING message_logs b WHERE a.ctid < b.ctid AND a.message_id = b.message_id;';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS message_logs_message_id_uq
            ON public.message_logs (message_id)
            WHERE message_id IS NOT NULL;
        RAISE NOTICE '[WABA] Índice de idempotencia message_logs_message_id_uq listo.';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS message_logs_org_created_idx
    ON public.message_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS message_logs_org_config_event_idx
    ON public.message_logs (organization_id, waba_config_id, last_event_at DESC);

CREATE INDEX IF NOT EXISTS message_logs_org_recipient_idx
    ON public.message_logs (organization_id, recipient_phone);

CREATE INDEX IF NOT EXISTS message_logs_subscriber_idx
    ON public.message_logs (subscriber_id)
    WHERE subscriber_id IS NOT NULL;

DROP TRIGGER IF EXISTS message_logs_set_updated_at ON public.message_logs;
CREATE TRIGGER message_logs_set_updated_at
    BEFORE UPDATE ON public.message_logs
    FOR EACH ROW EXECUTE FUNCTION waba_set_updated_at();


-- ---------------------------------------------------------------------
-- 10. subscribers — SOLO añadir opt-in de WhatsApp (nada más se toca)
-- ---------------------------------------------------------------------
-- Meta exige poder demostrar consentimiento. Estas columnas son aditivas.
DO $$
BEGIN
    IF to_regclass('public.subscribers') IS NULL THEN
        RAISE NOTICE '[WABA] Tabla subscribers no encontrada: se omite el opt-in.';
        RETURN;
    END IF;

    ALTER TABLE public.subscribers
        ADD COLUMN IF NOT EXISTS whatsapp_opt_in           boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at        timestamptz,
        ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source    text,
        ADD COLUMN IF NOT EXISTS whatsapp_phone_e164       text;

    RAISE NOTICE '[WABA] Columnas de opt-in añadidas a subscribers.';
END $$;

CREATE INDEX IF NOT EXISTS subscribers_whatsapp_phone_idx
    ON public.subscribers (whatsapp_phone_e164)
    WHERE whatsapp_phone_e164 IS NOT NULL;


-- ---------------------------------------------------------------------
-- 11. Cola de reproceso de webhooks fallidos (opcional pero recomendada)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waba_webhook_deadletter (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    received_at   timestamptz NOT NULL DEFAULT now(),
    reason        text NOT NULL,
    phone_number_id text,
    payload       jsonb NOT NULL,
    processed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS waba_webhook_deadletter_pending_idx
    ON public.waba_webhook_deadletter (received_at)
    WHERE processed_at IS NULL;


-- ---------------------------------------------------------------------
-- 12. Verificación final
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_missing TEXT := '';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='waba_configs' AND column_name='organization_id')
    THEN v_missing := v_missing || 'waba_configs.organization_id '; END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='waba_configs' AND column_name='access_token_encrypted')
    THEN v_missing := v_missing || 'waba_configs.access_token_encrypted '; END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='message_logs' AND column_name='message_id')
    THEN v_missing := v_missing || 'message_logs.message_id '; END IF;

    IF v_missing <> '' THEN
        RAISE EXCEPTION '[WABA] Migración incompleta. Faltan: %', v_missing;
    END IF;

    RAISE NOTICE '[WABA] ✅ Migración verificada correctamente.';
END $$;

COMMIT;

-- =====================================================================
-- POST-MIGRACIÓN (ejecutar a mano, NO dentro de la transacción)
-- =====================================================================
-- Una vez que TODAS las filas de waba_configs tengan organization_id y token:
--
--   ALTER TABLE public.waba_configs ALTER COLUMN organization_id        SET NOT NULL;
--   ALTER TABLE public.waba_configs ALTER COLUMN waba_id                SET NOT NULL;
--   ALTER TABLE public.waba_configs ALTER COLUMN phone_number_id        SET NOT NULL;
--   ALTER TABLE public.waba_configs ALTER COLUMN access_token_encrypted SET NOT NULL;
--   ALTER TABLE public.message_logs ALTER COLUMN organization_id        SET NOT NULL;
--
-- Verifica antes:
--   SELECT COUNT(*) FROM waba_configs WHERE organization_id IS NULL;   -- debe ser 0
--   SELECT COUNT(*) FROM message_logs WHERE organization_id IS NULL;   -- debe ser 0
-- =====================================================================


-- =====================================================================
-- ROLLBACK (solo si la migración creó las tablas desde cero)
-- =====================================================================
-- ⚠️ NO ejecutar si waba_configs / message_logs ya existían antes.
-- DROP TABLE IF EXISTS public.waba_webhook_deadletter;
-- DROP TABLE IF EXISTS public.message_logs;
-- DROP TABLE IF EXISTS public.waba_configs;
-- DROP FUNCTION IF EXISTS waba_set_updated_at();
--
-- Rollback parcial (columnas añadidas a tablas preexistentes):
-- ALTER TABLE public.waba_configs DROP COLUMN IF EXISTS access_token_encrypted;  -- etc.
-- =====================================================================
