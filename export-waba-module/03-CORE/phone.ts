/**
 * src/lib/waba/phone.ts
 * ---------------------------------------------------------------------------
 * Normalización de números a E.164 para la Cloud API.
 *
 * Portado de `src/utils/whatsapp.ts:52-77` del origen, que estaba **hardcodeado
 * para México** (`52` / `521`, GOTCHAS G-13). Aquí el país por defecto es
 * configurable y trae reglas para **Bolivia (591)**, que es donde opera SaaS TOI.
 *
 * Reglas de la Cloud API:
 *   · El campo `to` va SIN el `+`: `59171234567`, no `+59171234567`.
 *   · Sin espacios, guiones ni paréntesis.
 *   · Meta responde 131026 / "Account not registered" si el número no tiene
 *     WhatsApp o si el formato no le encaja → por eso probamos variantes.
 *
 * Sin dependencias. Si ya usas `libphonenumber-js`, el shim del final delega en él.
 */

import { WABA_CONFIG } from './column-map';

/** Deja solo dígitos. `+591 7123-4567` → `59171234567` */
export function sanitizePhone(input: string): string {
    return (input ?? '').replace(/\D/g, '');
}

/** Formato de presentación: `59171234567` → `+591 71234567` */
export function formatPhoneForDisplay(input: string): string {
    const digits = sanitizePhone(input);
    if (!digits) return '';

    const cc = WABA_CONFIG.defaultCountryCode;
    if (digits.startsWith(cc)) {
        return `+${cc} ${digits.slice(cc.length)}`;
    }
    return `+${digits}`;
}

/**
 * Reglas por país para generar variantes de un mismo número.
 * Añade aquí los países donde opere SaaS TOI.
 */
const COUNTRY_VARIANTS: Record<string, (digits: string) => string[]> = {
    /**
     * Bolivia (+591). Los móviles son 8 dígitos y empiezan por 6 o 7.
     * Casos habituales en bases de datos de ISP:
     *   · `71234567`      → local sin prefijo         → añadir 591
     *   · `59171234567`   → ya en E.164               → tal cual
     *   · `0059171234567` → prefijo internacional 00  → quitar el 00
     */
    '591': (digits) => {
        const out: string[] = [];

        if (digits.length === 8 && /^[67]/.test(digits)) {
            out.push(`591${digits}`);
        }
        if (digits.startsWith('00591')) {
            out.push(digits.slice(2));
        }
        if (digits.startsWith('591') && digits.length === 11) {
            out.push(digits);
        }
        return out;
    },

    /**
     * México (+52). Regla heredada del origen: algunas bases guardan el "1"
     * de móvil (`+52 1 ...`) y otras no. Meta acepta según el caso.
     */
    '52': (digits) => {
        const out: string[] = [];
        if (digits.startsWith('521') && digits.length === 13) {
            out.push(`52${digits.slice(3)}`);
        }
        if (digits.startsWith('52') && !digits.startsWith('521') && digits.length === 12) {
            out.push(`521${digits.slice(2)}`);
        }
        return out;
    },

    /** Argentina (+54): el "9" de móvil, análogo al "1" mexicano. */
    '54': (digits) => {
        const out: string[] = [];
        if (digits.startsWith('549')) out.push(`54${digits.slice(3)}`);
        else if (digits.startsWith('54')) out.push(`549${digits.slice(2)}`);
        return out;
    },
};

/**
 * Devuelve todas las variantes plausibles del número, en orden de preferencia.
 * El emisor las prueba una a una ante `Account not registered`.
 *
 * ```ts
 * buildPhoneCandidates('71234567')     // ['71234567', '59171234567']
 * buildPhoneCandidates('+591 7123 4567') // ['59171234567']
 * ```
 */
export function buildPhoneCandidates(
    input: string,
    countryCode = WABA_CONFIG.defaultCountryCode
): string[] {
    const digits = sanitizePhone(input);
    if (!digits) return [];

    const candidates = new Set<string>([digits]);

    for (const variant of COUNTRY_VARIANTS[countryCode]?.(digits) ?? []) {
        candidates.add(variant);
    }

    // Regla genérica: si es claramente un número local (7–9 dígitos) y no
    // empieza ya por el prefijo del país, probar con el prefijo antepuesto.
    if (digits.length >= 7 && digits.length <= 9 && !digits.startsWith(countryCode)) {
        candidates.add(`${countryCode}${digits}`);
    }

    // Descarta lo que nunca puede ser un E.164 válido.
    return [...candidates].filter((c) => c.length >= 8 && c.length <= 15);
}

/** ¿Parece un E.164 válido? Validación estructural, no de existencia real. */
export function isValidE164(input: string): boolean {
    const digits = sanitizePhone(input);
    return digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0');
}

/**
 * Normaliza a la forma canónica que guardaremos en
 * `subscribers.whatsapp_phone_e164` y `message_logs.recipient_phone`.
 * Devuelve null si no se puede normalizar.
 */
export function toCanonicalE164(
    input: string,
    countryCode = WABA_CONFIG.defaultCountryCode
): string | null {
    const [best] = buildPhoneCandidates(input, countryCode);
    if (!best || !isValidE164(best)) return null;
    return best.startsWith(countryCode) ? best : `${countryCode}${best}`;
}

/**
 * Compara dos teléfonos ignorando formato. Útil para casar el
 * `recipient_phone` de un webhook con un `subscriber` de la base.
 */
export function phonesMatch(a: string, b: string): boolean {
    const da = sanitizePhone(a);
    const db = sanitizePhone(b);
    if (!da || !db) return false;
    if (da === db) return true;
    // Coincidencia por los últimos 8 dígitos (longitud del móvil boliviano)
    return da.slice(-8) === db.slice(-8) && da.slice(-8).length === 8;
}

/* ==========================================================================
 * SHIM opcional con libphonenumber-js
 * ==========================================================================
 * Si ya tienes la dependencia, sustituye toCanonicalE164 por:
 *
 *   import { parsePhoneNumberFromString } from 'libphonenumber-js';
 *
 *   export function toCanonicalE164(input: string, region = 'BO'): string | null {
 *       const parsed = parsePhoneNumberFromString(input, region as never);
 *       if (!parsed?.isValid()) return null;
 *       return parsed.number.replace('+', '');   // Meta lo quiere SIN el '+'
 *   }
 *
 * Conserva `buildPhoneCandidates`: libphonenumber valida, pero no resuelve las
 * variantes que Meta acepta o rechaza según el país.
 * ========================================================================== */
