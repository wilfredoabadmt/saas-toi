/**
 * src/lib/waba/crypto.ts
 * ---------------------------------------------------------------------------
 * Cifrado AES-256-GCM del access token de WhatsApp Business.
 *
 * ⚠️ SaaS TOI YA declara AES-256-GCM para credenciales en reposo.
 *    → Si ya tienes `src/lib/crypto.ts` o `src/lib/encryption.ts`, **REUTILÍZALO**
 *      y borra este archivo, dejando solo el shim del final.
 *
 * Motivo de existir: el proyecto origen guardaba el token EN CLARO
 * (`supabase_setup.sql:72`). Un token WABA permite enviar mensajes en nombre
 * del cliente; en claro, cualquier dump de la base lo compromete. Ver GOTCHAS G-06.
 *
 * Formato del ciphertext (una sola columna, autodescriptivo y versionado):
 *
 *     v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
 *
 * El prefijo de versión permite rotar el algoritmo en el futuro sin migrar
 * todas las filas de golpe.
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recomendado para GCM
const VERSION = 'v1';

/**
 * Lee y valida la clave. Acepta hex de 64 chars o base64 de 32 bytes.
 * Genera una con:  openssl rand -base64 32
 */
function getKey(): Buffer {
    const raw = process.env.WABA_ENCRYPTION_KEY;

    if (!raw) {
        throw new Error(
            '[WABA] WABA_ENCRYPTION_KEY no está definida. Genera una con: openssl rand -base64 32'
        );
    }

    const key = /^[0-9a-fA-F]{64}$/.test(raw)
        ? Buffer.from(raw, 'hex')
        : Buffer.from(raw, 'base64');

    if (key.length !== 32) {
        throw new Error(
            `[WABA] WABA_ENCRYPTION_KEY debe tener 32 bytes para AES-256-GCM (tiene ${key.length}). ` +
                'Genera una nueva con: openssl rand -base64 32'
        );
    }

    return key;
}

/** Cifra un secreto. Devuelve el string listo para guardar en la columna. */
export function encryptSecret(plaintext: string): string {
    if (!plaintext) {
        throw new Error('[WABA] No se puede cifrar un valor vacío.');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
        VERSION,
        iv.toString('base64'),
        authTag.toString('base64'),
        ciphertext.toString('base64'),
    ].join(':');
}

/**
 * Descifra un secreto.
 *
 * Tolerancia de migración: si el valor NO tiene el formato versionado, se asume
 * que es un token en claro heredado y se devuelve tal cual (con warning).
 * Así el módulo funciona durante la ventana de migración. Elimina esta rama
 * en cuanto hayas cifrado todo (ver NOTAS_MIGRACION.md).
 */
export function decryptSecret(payload: string): string {
    if (!payload) {
        throw new Error('[WABA] No hay token que descifrar.');
    }

    if (!isEncrypted(payload)) {
        console.warn(
            '[WABA] Token encontrado SIN CIFRAR. Ejecuta scripts/encrypt-existing-waba-tokens.ts.'
        );
        return payload;
    }

    const [, ivB64, tagB64, dataB64] = payload.split(':');

    try {
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            getKey(),
            Buffer.from(ivB64, 'base64')
        );
        decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

        return Buffer.concat([
            decipher.update(Buffer.from(dataB64, 'base64')),
            decipher.final(),
        ]).toString('utf8');
    } catch {
        // No propagamos el error original: podría filtrar información del ciphertext.
        throw new Error(
            '[WABA] No se pudo descifrar el token. ¿Cambió WABA_ENCRYPTION_KEY o el dato está corrupto?'
        );
    }
}

/** ¿Este valor ya está cifrado con el formato de este módulo? */
export function isEncrypted(value: string | null | undefined): boolean {
    if (!value) return false;
    const parts = value.split(':');
    return parts.length === 4 && parts[0] === VERSION;
}

/**
 * Enmascara un token para logs y UI. NUNCA loguees el token completo.
 * `EAAG...` → `EAAG…7f2a (len=211)`
 */
export function maskToken(token: string | null | undefined): string {
    if (!token) return '(vacío)';
    if (token.length <= 12) return '***';
    return `${token.slice(0, 4)}…${token.slice(-4)} (len=${token.length})`;
}

/* ==========================================================================
 * SHIM — si ya tienes una utilidad de cifrado en SaaS TOI
 * ==========================================================================
 * Borra todo lo de arriba y deja solo esto, apuntando a tu implementación:
 *
 *   import { encrypt, decrypt } from '@/lib/encryption';
 *
 *   export const encryptSecret = (p: string) => encrypt(p);
 *   export const decryptSecret = (c: string) => decrypt(c);
 *   export const isEncrypted   = (v?: string | null) => Boolean(v?.startsWith('v1:'));
 *   export const maskToken     = (t?: string | null) =>
 *       !t ? '(vacío)' : t.length <= 12 ? '***' : `${t.slice(0,4)}…${t.slice(-4)}`;
 *
 * Requisito: tu `encrypt` debe ser AES-256-GCM (no CBC) — GCM aporta
 * autenticación, que es lo que impide manipular el ciphertext.
 * ========================================================================== */
