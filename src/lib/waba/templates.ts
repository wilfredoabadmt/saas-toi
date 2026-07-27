/**
 * src/lib/waba/templates.ts
 * ---------------------------------------------------------------------------
 * Validación y construcción de plantillas WhatsApp para Meta.
 *
 * Incluye:
 *   - Validación de las 6 reglas de Meta (nombre, idioma, variables secuenciales, etc.)
 *   - Presets de plantillas pre-aprobadas para ISPs (UTILITY)
 *   - Construcción de payloads para creación y envío de plantillas
 *
 * Fuente: export-waba-module/03-CORE/templates.ts
 */

/* ==========================================================================
 * Constantes y tipos
 * ========================================================================== */

/** Expresión regular para variables {{n}} en el cuerpo de una plantilla. */
const VARIABLE_REGEX = /\{\{(\d+)\}\}/g;

/** Idiomas soportados por Meta (lista reducida, extendible). */
const VALID_LANGUAGES = new Set([
    'es', 'es_MX', 'es_AR', 'es_CO', 'es_CL', 'es_PE', 'es_EC',
    'en', 'en_US', 'en_GB', 'pt', 'pt_BR', 'fr', 'de', 'it',
    'zh', 'zh_CN', 'zh_TW', 'ja', 'ko', 'ar', 'hi',
]);

export interface TemplateValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    normalizedName: string;
    variableCount: number;
}

export interface WhatsAppTemplateSummary {
    id?: string;
    name?: string;
    status?: string;
    language?: string;
    category?: string;
    sub_category?: string;
    components?: Array<{
        type: string;
        text?: string;
        format?: string;
        buttons?: unknown[];
    }>;
}

/* ==========================================================================
 * Utilidades de variables
 * ========================================================================== */

export function extractVariableIndexes(bodyText: string): number[] {
    const indexes: number[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(VARIABLE_REGEX.source, 'g');
    while ((match = re.exec(bodyText ?? '')) !== null) {
        indexes.push(Number(match[1]));
    }
    return indexes;
}

export function countTemplateVariables(bodyText: string): number {
    const idx = extractVariableIndexes(bodyText);
    return idx.length ? Math.max(...idx) : 0;
}

export function normalizeTemplateName(name: string): string {
    return (name ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
}

export function isValidTemplateLanguage(language: string): boolean {
    return VALID_LANGUAGES.has((language ?? '').trim());
}

/* ==========================================================================
 * Reglas de validación de Meta
 * ========================================================================== */

/** Regla Meta: `{{1}}, {{2}}, …` sin huecos ni empezar en {{0}} o {{2}}. */
export function hasSequentialVariables(bodyText: string): boolean {
    const idx = extractVariableIndexes(bodyText);
    if (!idx.length) return true;
    const unique = [...new Set(idx)].sort((a, b) => a - b);
    return unique.every((value, i) => value === i + 1);
}

/** Regla Meta: no puede empezar ni terminar con una variable. */
export function hasEdgeVariable(bodyText: string): boolean {
    const t = (bodyText ?? '').trim();
    return /^\{\{\d+\}\}/.test(t) || /\{\{\d+\}\}$/.test(t);
}

/** Regla Meta: dos variables no pueden ir seguidas (`{{1}} {{2}}`). */
export function hasAdjacentVariables(bodyText: string): boolean {
    return /\}\}\s*\{\{/.test(bodyText ?? '');
}

/**
 * Valida una plantilla contra las reglas de Meta.
 * Ejecuta esto ANTES de llamar a `createTemplate`.
 */
export function validateTemplate(input: {
    name: string;
    language: string;
    category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
    bodyText: string;
    footerText?: string;
    headerText?: string;
}): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const normalizedName = normalizeTemplateName(input.name);
    const body = (input.bodyText ?? '').trim();

    // -- Nombre ------------------------------------------------------------
    if (!normalizedName) {
        errors.push('El nombre debe contener letras, números o guiones bajos.');
    }
    if (normalizedName !== input.name.trim().toLowerCase()) {
        warnings.push(`El nombre se normalizó a "${normalizedName}".`);
    }

    // -- Idioma ------------------------------------------------------------
    if (!isValidTemplateLanguage(input.language)) {
        errors.push('Usa un código de idioma válido de Meta, como es, es_MX o en_US.');
    }

    // -- Cuerpo ------------------------------------------------------------
    if (!body) {
        errors.push('El cuerpo de la plantilla es obligatorio.');
    }
    if (body.length > 1024) {
        errors.push(`El cuerpo supera los 1024 caracteres de Meta (tiene ${body.length}).`);
    }
    if (hasEdgeVariable(body)) {
        errors.push(
            'Una variable no puede ir al principio ni al final del cuerpo. ' +
                'Añade texto antes de la primera y después de la última.'
        );
    }
    if (hasAdjacentVariables(body)) {
        errors.push(
            'Dos variables no pueden ir seguidas. Intercala texto o puntuación entre ellas.'
        );
    }
    if (!hasSequentialVariables(body)) {
        errors.push('Las variables deben ser secuenciales y empezar en {{1}}.');
    }

    // -- Extras ------------------------------------------------------------
    if (input.footerText && input.footerText.length > 60) {
        errors.push(`El pie supera los 60 caracteres de Meta (tiene ${input.footerText.length}).`);
    }
    if (input.headerText && input.headerText.length > 60) {
        errors.push(`La cabecera supera los 60 caracteres (tiene ${input.headerText.length}).`);
    }

    // -- Avisos de categoría ----------------------------------------------
    const variableCount = countTemplateVariables(body);
    if (input.category === 'MARKETING') {
        warnings.push(
            'Las plantillas MARKETING tienen coste por mensaje y peor tasa de aprobación. ' +
                'Un recordatorio de pago normalmente califica como UTILITY.'
        );
    }
    if (variableCount > 10) {
        warnings.push(`${variableCount} variables es mucho; Meta suele rechazar plantillas así.`);
    }

    return { valid: errors.length === 0, errors, warnings, normalizedName, variableCount };
}

/* ==========================================================================
 * Construcción del payload para Meta
 * ========================================================================== */

/**
 * Meta exige un bloque `example.body_text` cuando la plantilla tiene variables.
 * Sin él, la creación falla con "missing example parameters".
 */
export function buildBodyExample(bodyText: string): { body_text: string[][] } | undefined {
    const count = countTemplateVariables(bodyText);
    if (!count) return undefined;

    const defaults = [
        'Juan Pérez',        // {{1}} nombre del abonado
        'Bs. 150',           // {{2}} monto
        '15/08/2026',        // {{3}} fecha de vencimiento
        'Plan Fibra 50MB',   // {{4}} plan contratado
        'TOI-000123',        // {{5}} nº de contrato
        '3',                 // {{6}} días restantes
    ];

    return {
        body_text: [
            Array.from({ length: count }, (_, i) => defaults[i] ?? `ejemplo_${i + 1}`),
        ],
    };
}

/** Ensambla el array `components` que espera la Graph API para CREAR la plantilla. */
export function buildTemplateComponents(input: {
    bodyText: string;
    headerText?: string;
    footerText?: string;
    buttons?: Array<{ type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY'; text: string; url?: string; phone_number?: string }>;
}): unknown[] {
    const components: unknown[] = [];

    if (input.headerText?.trim()) {
        components.push({ type: 'HEADER', format: 'TEXT', text: input.headerText.trim() });
    }

    const example = buildBodyExample(input.bodyText);
    components.push({
        type: 'BODY',
        text: input.bodyText.trim(),
        ...(example ? { example } : {}),
    });

    if (input.footerText?.trim()) {
        components.push({ type: 'FOOTER', text: input.footerText.trim() });
    }

    if (input.buttons?.length) {
        components.push({ type: 'BUTTONS', buttons: input.buttons });
    }

    return components;
}

/**
 * Construye el bloque `components` del ENVÍO (los valores reales de {{n}}).
 */
export function buildSendComponents(values: string[]): unknown[] | undefined {
    const parameters = (values ?? [])
        .map((v) => (v ?? '').trim())
        .filter(Boolean)
        .map((text) => ({ type: 'text' as const, text }));

    if (!parameters.length) return undefined;
    return [{ type: 'body', parameters }];
}

/**
 * Verifica que el nº de parámetros case con lo que la plantilla espera.
 * Meta devuelve 132000 ("number of parameters does not match") si no cuadra.
 */
export function validateSendParameters(
    template: WhatsAppTemplateSummary,
    values: string[]
): { valid: boolean; error?: string; expected: number; received: number } {
    const bodyText =
        template.components?.find((c) => c.type === 'BODY')?.text ?? '';
    const expected = countTemplateVariables(bodyText);
    const received = (values ?? []).filter((v) => v?.trim()).length;

    if (expected !== received) {
        return {
            valid: false,
            expected,
            received,
            error: `La plantilla "${template.name}" espera ${expected} variable(s) y se enviaron ${received}.`,
        };
    }

    return { valid: true, expected, received };
}

/* ==========================================================================
 * Utilidades de lectura
 * ========================================================================== */

export function getTemplateBody(template: WhatsAppTemplateSummary): string {
    return (
        template.components?.find((c) => c.type === 'BODY')?.text ??
        'Cuerpo de la plantilla no disponible.'
    );
}

export function isApproved(template: WhatsAppTemplateSummary): boolean {
    return template.status?.toUpperCase() === 'APPROVED';
}

/** Sustituye `{{n}}` por los valores dados. Solo para previsualización en UI. */
export function renderTemplatePreview(bodyText: string, values: string[]): string {
    return (bodyText ?? '').replace(/\{\{(\d+)\}\}/g, (match, index) => {
        const value = values[Number(index) - 1];
        return value?.trim() ? value : match;
    });
}

/* ==========================================================================
 * Plantillas sugeridas para un ISP (SaaS TOI)
 * ========================================================================== */

export const ISP_TEMPLATE_PRESETS = [
    {
        name: 'recordatorio_pago',
        category: 'UTILITY' as const,
        language: 'es',
        bodyText:
            'Hola {{1}}, te recordamos que tu servicio de internet vence el {{2}}. ' +
            'El monto a pagar es {{3}}. Puedes cancelar en nuestras oficinas o por transferencia. Gracias.',
        footerText: 'TELECOMUNICACIONES OPORTUNAS INTELIGENTES S.R.L.',
    },
    {
        name: 'aviso_corte',
        category: 'UTILITY' as const,
        language: 'es',
        bodyText:
            'Estimado {{1}}, tu servicio presenta un saldo pendiente de {{2}} desde el {{3}}. ' +
            'Para evitar la suspensión, regulariza tu pago en las próximas 24 horas.',
        footerText: 'Contáctanos si ya realizaste el pago.',
    },
    {
        name: 'pago_confirmado',
        category: 'UTILITY' as const,
        language: 'es',
        bodyText:
            'Hola {{1}}, confirmamos la recepción de tu pago de {{2}}. ' +
            'Tu servicio está activo hasta el {{3}}. Gracias por tu preferencia.',
        footerText: 'Recibo disponible en tu portal.',
    },
    {
        name: 'servicio_restablecido',
        category: 'UTILITY' as const,
        language: 'es',
        bodyText:
            'Hola {{1}}, tu servicio de internet fue restablecido correctamente. ' +
            'Si continúas con problemas de conexión, responde a este mensaje y un técnico te atenderá.',
    },
] as const;
