/**
 * src/lib/waba/templates.ts
 * ---------------------------------------------------------------------------
 * Validación y construcción de plantillas de WhatsApp.
 *
 * Portado íntegro de `src/app/actions/whatsapp.ts:109-166, 883-983` del origen.
 * Es la parte más valiosa del módulo original: valida **antes** de llamar a
 * Meta las 6 reglas que provocan la mayoría de los rechazos automáticos.
 *
 * Sin estas comprobaciones, cada intento fallido consume cuota de creación de
 * plantillas y puede penalizar la calidad de la WABA.
 */

import type { WhatsAppTemplateSummary } from './graph-client';

/* ==========================================================================
 * Validación
 * ========================================================================== */

export interface TemplateValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    /** Nombre normalizado a las reglas de Meta (minúsculas + guiones bajos). */
    normalizedName: string;
    /** Nº de variables detectadas, para saber cuántos parámetros exigir al enviar. */
    variableCount: number;
}

/** Normaliza el nombre: minúsculas, sin acentos, espacios → `_`. */
export function normalizeTemplateName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // quita acentos: "recordatorio_pagó" → "recordatorio_pago"
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 512);
}

/** Códigos válidos de Meta: `es`, `es_MX`, `en_US`, `pt_BR`… */
export function isValidTemplateLanguage(language: string): boolean {
    return /^[a-z]{2}(?:_[A-Z]{2})?$/.test((language ?? '').trim());
}

/** Índices de las variables `{{n}}` presentes en el texto. */
export function extractVariableIndexes(bodyText: string): number[] {
    return [...(bodyText ?? '').matchAll(/\{\{(\d+)\}\}/g)]
        .map((m) => Number(m[1]))
        .filter(Number.isFinite);
}

/** Nº de variables (el índice más alto: Meta exige que sean secuenciales). */
export function countTemplateVariables(bodyText: string): number {
    const idx = extractVariableIndexes(bodyText);
    return idx.length ? Math.max(...idx) : 0;
}

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
 *
 * Los ejemplos por defecto están pensados para un ISP boliviano.
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

/** Ensambla el array `components` que espera la Graph API. */
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
 * Portado de `buildTemplateBodyComponents` del origen.
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
 * Meta devuelve 132000 ("number of parameters does not match") si no cuadra;
 * comprobarlo antes ahorra una llamada fallida.
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
 * ==========================================================================
 * Categoría UTILITY: sin coste de marketing y con mejor tasa de aprobación,
 * porque son transaccionales sobre un servicio ya contratado.
 */

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
