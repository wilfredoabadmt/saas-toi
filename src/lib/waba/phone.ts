/**
 * src/lib/waba/phone.ts
 * ---------------------------------------------------------------------------
 * Normalización de números de teléfono para el módulo WABA.
 *
 * SaaS TOI opera principalmente en Bolivia (+591), pero soporta otros países.
 * La función `buildPhoneCandidates` genera variantes plausibles de un número
 * para resolver el problema común de "Account not registered" de Meta.
 *
 * Fuente: export-waba-module/03-CORE/phone.ts
 */

import { WABA_CONFIG } from './column-map';

/**
 * Limpia un número de teléfono: solo dígitos, sin espacios, guiones, ni +.
 */
export function sanitizePhone(input: string): string {
    return (input ?? '').replace(/[^\d]/g, '');
}

/**
 * Construye el prefijo E.164 de un país a partir de su código de marcación.
 * Ejemplo: '+591' → '591', '52' → '52'.
 */
export function buildE164Prefix(countryCallingCode: string): string {
    return (countryCallingCode ?? '').replace(/[^\d]/g, '');
}

/**
 * Intenta detectar el código de país a partir del número sin formato.
 * Devuelve '591' (Bolivia) por defecto.
 */
export function detectCountryCode(digits: string): string {
    if (digits.startsWith('591')) return '591';
    if (digits.startsWith('52')) return '52';
    if (digits.startsWith('54')) return '54';
    if (digits.startsWith('55')) return '55';
    if (digits.startsWith('57')) return '57';
    if (digits.startsWith('51')) return '51';
    if (digits.startsWith('56')) return '56';
    if (digits.startsWith('593')) return '593';
    if (digits.startsWith('595')) return '595';
    if (digits.startsWith('598')) return '598';

    // Si tiene 8 dígitos y empieza por 6 o 7, probablemente es Bolivia sin prefijo
    if (digits.length === 8 && /^[67]/.test(digits)) return '591';

    return WABA_CONFIG.defaultCountryCode;
}

/**
 * Variantes de país con reglas específicas para números móviles.
 */
const COUNTRY_VARIANTS: Record<string, (digits: string) => string[]> = {
    /**
     * Bolivia (+591). Los móviles son 8 dígitos y empiezan por 6 o 7.
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
     * México (+52). Algunas bases guardan el "1" de móvil y otras no.
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

    /** Argentina (+54): el "9" de móvil. */
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
 * buildPhoneCandidates('71234567')     // ['59171234567', '71234567']
 * buildPhoneCandidates('+591 7123 4567') // ['59171234567']
 * ```
 */
export function buildPhoneCandidates(
    input: string,
    countryCode?: string
): string[] {
    const digits = sanitizePhone(input);
    if (!digits) return [];

    const cc = countryCode ?? detectCountryCode(digits);
    const candidates = new Set<string>();

    // Siempre incluir el número limpio
    candidates.add(digits);

    // Variantes específicas del país
    for (const variant of COUNTRY_VARIANTS[cc]?.(digits) ?? []) {
        candidates.add(variant);
    }

    // Regla genérica: si es claramente un número local (7–9 dígitos) y no
    // empieza ya por el prefijo del país, probar con el prefijo antepuesto.
    if (digits.length >= 7 && digits.length <= 9 && !digits.startsWith(cc)) {
        candidates.add(`${cc}${digits}`);
    }

    // Descarta lo que nunca puede ser un E.164 válido (8-15 dígitos)
    return [...candidates].filter((c) => c.length >= 8 && c.length <= 15);
}

/**
 * Normaliza un número a formato E.164 limpio (solo dígitos, con prefijo de país).
 * Devuelve la primera candidata válida.
 */
export function normalizePhoneToE164(
    input: string,
    countryCode?: string
): string | null {
    const candidates = buildPhoneCandidates(input, countryCode);
    return candidates[0] ?? null;
}
