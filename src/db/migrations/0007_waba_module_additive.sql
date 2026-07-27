-- =====================================================================
-- MIGRACIÓN WABA ADAPTADA — SaaS TOI
-- =====================================================================
-- Generada a partir de export-waba-module/02-DB-DRIZZLE/migration.sql
-- Adaptada al esquema EXISTENTE del proyecto.
--
-- REGLAS:
--   ✅ 100% IDEMPOTENTE y ADITIVA (ADD COLUMN IF NOT EXISTS, CREATE IF NOT EXISTS)
--   ❌ NO hace DROP de nada
--   ❌ NO renombra columnas existentes
--   ❌ NO cambia tipos existentes
--   ✅ Mapea columnas del export module a los nombres REALES del proyecto:
--        · encrypted_token  ← el export llama access_token_encrypted
--        · display_phone    ← el export llama display_phone_number
--        · wamid            ← el export llama message_id
--        · delivery_status  ← el export llama status
--        · failure_reason   ← el export llama error_message
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Helper de updated_at (si no existe)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION waba_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 1. waba_configs — añadir columnas que FALTAN
-- =====================================================================
-- Columnas que YA EXISTEN (NO se tocan): id, organization_id, waba_id,
-- phone_number_id, display_phone, encrypted_token, key_version,
-- connection_status, connected_at, disconnected_at, created_at, updated_at

ALTER TABLE public.waba_configs
    ADD COLUMN IF NOT EXISTS verified_name      text,
    ADD COLUMN IF NOT EXISTS business_id         text,
    ADD COLUMN IF NOT EXISTS meta_user_id        text,
    ADD COLUMN IF NOT EXISTS token_type          text,
    ADD COLUMN IF NOT EXISTS token_expires_at    timestamptz,
    ADD COLUMN IF NOT EXISTS webhook_verify_token text,
    ADD COLUMN IF NOT EXISTS is_active           boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS last_error          text,
    ADD COLUMN IF NOT EXISTS last_synced_at      timestamptz;

-- Defaults para is_active en filas existentes
UPDATE public.waba_configs SET is_active = true WHERE is_active IS NULL;


-- =====================================================================
-- 2. waba_configs — índices nuevos
-- =====================================================================
-- El proyecto YA TIENE: organization_id UNIQUE, phone_number_id UNIQUE
-- Añadimos: (org, waba, phone) UNIQUE, org+active, meta_user_id

CREATE UNIQUE INDEX IF NOT EXISTS waba_configs_org_waba_phone_uq
    ON public.waba_configs (organization_id, waba_id, phone_number_id);

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


-- =====================================================================
-- 3. message_logs — añadir columnas que FALTAN
-- =====================================================================
-- Columnas que YA EXISTEN (NO se tocan): id, organization_id, subscriber_id,
-- wamid (≈ message_id), direction, message_type, template_name,
-- content_preview, delivery_status (≈ status), failure_reason (≈ error_message),
-- sent_at, status_updated_at, created_at, updated_at

ALTER TABLE public.message_logs
    ADD COLUMN IF NOT EXISTS waba_config_id    uuid,
    ADD COLUMN IF NOT EXISTS channel           text DEFAULT 'whatsapp',
    ADD COLUMN IF NOT EXISTS recipient_phone   text,
    ADD COLUMN IF NOT EXISTS template_language text,
    ADD COLUMN IF NOT EXISTS message_text      text,
    ADD COLUMN IF NOT EXISTS error_code        text,
    ADD COLUMN IF NOT EXISTS error_title       text,
    ADD COLUMN IF NOT EXISTS raw_payload       jsonb,
    ADD COLUMN IF NOT EXISTS last_event_at     timestamptz;

-- Defaults y backfill
UPDATE public.message_logs SET channel = 'whatsapp' WHERE channel IS NULL;
UPDATE public.message_logs SET last_event_at = COALESCE(sent_at, created_at) WHERE last_event_at IS NULL;


-- =====================================================================
-- 4. message_logs — FKs opcionales
-- =====================================================================
DO $$
BEGIN
    -- FK a waba_configs
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'message_logs_waba_config_id_fkey'
    ) AND NOT EXISTS (
        SELECT 1 FROM public.message_logs m
        LEFT JOIN public.waba_configs w ON w.id = m.waba_config_id
        WHERE m.waba_config_id IS NOT NULL AND w.id IS NULL
    ) THEN
        ALTER TABLE public.message_logs
            ADD CONSTRAINT message_logs_waba_config_id_fkey
            FOREIGN KEY (waba_config_id) REFERENCES public.waba_configs(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN others THEN
    RAISE WARNING '[WABA] FK message_logs→waba_configs omitida: %', SQLERRM;
END $$;


-- =====================================================================
-- 5. message_logs — ÍNDICE DE IDEMPOTENCIA (el más importante)
-- =====================================================================
-- UNIQUE parcial sobre wamid para que el webhook de Meta (que reenvía
-- eventos) no duplique filas via onConflictDoUpdate.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM (
            SELECT wamid FROM public.message_logs
            WHERE wamid IS NOT NULL
            GROUP BY wamid HAVING COUNT(*) > 1
        ) d
    ) THEN
        RAISE WARNING '[WABA] Hay wamid DUPLICADOS en message_logs. Índice único OMITIDO.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS message_logs_wamid_uq
            ON public.message_logs (wamid)
            WHERE wamid IS NOT NULL;
        RAISE NOTICE '[WABA] Índice de idempotencia message_logs_wamid_uq listo.';
    END IF;
END $$;

-- Índices de查询
CREATE INDEX IF NOT EXISTS message_logs_org_created_idx
    ON public.message_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS message_logs_org_config_event_idx
    ON public.message_logs (organization_id, waba_config_id, last_event_at DESC);

CREATE INDEX IF NOT EXISTS message_logs_org_recipient_idx
    ON public.message_logs (organization_id, recipient_phone);

-- Trigger updated_at
DROP TRIGGER IF EXISTS message_logs_set_updated_at ON public.message_logs;
CREATE TRIGGER message_logs_set_updated_at
    BEFORE UPDATE ON public.message_logs
    FOR EACH ROW EXECUTE FUNCTION waba_set_updated_at();


-- =====================================================================
-- 6. subscribers — SOLO añadir opt-in de WhatsApp
-- =====================================================================
ALTER TABLE public.subscribers
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in        boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at     timestamptz,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in_source text,
    ADD COLUMN IF NOT EXISTS whatsapp_phone_e164    text;

CREATE INDEX IF NOT EXISTS subscribers_whatsapp_phone_idx
    ON public.subscribers (whatsapp_phone_e164)
    WHERE whatsapp_phone_e164 IS NOT NULL;


-- =====================================================================
-- 7. waba_webhook_deadletter — tabla nueva
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.waba_webhook_deadletter (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    received_at     timestamptz NOT NULL DEFAULT now(),
    reason          text NOT NULL,
    phone_number_id text,
    payload         jsonb NOT NULL,
    processed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS waba_webhook_deadletter_pending_idx
    ON public.waba_webhook_deadletter (received_at)
    WHERE processed_at IS NULL;


-- =====================================================================
-- 8. Verificación final
-- =====================================================================
DO $$
DECLARE
    v_ok boolean := true;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='waba_configs' AND column_name='is_active') THEN
        RAISE WARNING '[WABA] waba_configs.is_active no existe'; v_ok := false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='message_logs' AND column_name='waba_config_id') THEN
        RAISE WARNING '[WABA] message_logs.waba_config_id no existe'; v_ok := false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='subscribers' AND column_name='whatsapp_opt_in') THEN
        RAISE WARNING '[WABA] subscribers.whatsapp_opt_in no existe'; v_ok := false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'waba_webhook_deadletter') THEN
        RAISE WARNING '[WABA] tabla waba_webhook_deadletter no existe'; v_ok := false;
    END IF;

    IF v_ok THEN
        RAISE NOTICE '[WABA] ✅ Migración adaptada verificada correctamente.';
    END IF;
END $$;

COMMIT;
