/**
 * src/lib/waba/crypto.ts
 * ---------------------------------------------------------------------------
 * Shim que delega en la utilidad de cifrado AES-256-GCM existente del proyecto.
 *
 * El export-waba-module traía su propia implementación con WABA_ENCRYPTION_KEY
 * y formato `v1:iv:tag:ciphertext`. Pero SaaS TOI YA tiene `src/lib/crypto.ts`
 * con ENCRYPTION_KEY y formato `iv:tag:ciphertext`. El token WABA ya está
 * guardado en la DB con ese formato.
 *
 * Regla del proyecto: si ya existe una utilidad AES-256-GCM, reutilízala.
 * Este archivo es un shim delgado.
 */

import { encrypt, decrypt } from '@/lib/crypto';

/** Cifra un secreto. Devuelve el string listo para guardar en la columna. */
export function encryptSecret(plaintext: string): string {
    if (!plaintext) {
        throw new Error('[WABA] No se puede cifrar un valor vacío.');
    }
    return encrypt(plaintext);
}

/**
 * Descifra un secreto.
 *
 * Compatibilidad: soporta el formato del proyecto (`iv:tag:ciphertext`)
 * y el formato del export module (`v1:iv:tag:ciphertext`).
 * Si detecta el prefijo `v1:`, lo quita antes de descifrar.
 */
export function decryptSecret(encryptedData: string): string {
    if (!encryptedData) {
        throw new Error('[WABA] No se puede descifrar un valor vacío.');
    }

    // Compatibilidad con formato v1: del export module
    if (encryptedData.startsWith('v1:')) {
        const withoutVersion = encryptedData.slice(3);
        return decrypt(withoutVersion);
    }

    // Formato estándar del proyecto: iv:tag:ciphertext
    return decrypt(encryptedData);
}
