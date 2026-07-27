'use server';

/**
 * src/app/actions/templates.actions.ts
 * ---------------------------------------------------------------------------
 * Server Actions de gestión de plantillas de WhatsApp.
 *
 * Requiere el permiso `whatsapp_business_management` de Meta.
 *
 * Toda la validación previa vive en `@/lib/waba/templates`. Se valida ANTES de
 * llamar a Meta porque cada creación rechazada consume cuota y, si se repite,
 * penaliza la calidad de la WABA.
 */

import { revalidatePath } from 'next/cache';

import { assertWabaEnv } from '@/lib/waba/column-map';
import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  MetaGraphError,
  type WhatsAppTemplateSummary,
} from '@/lib/waba/graph-client';
import {
  buildTemplateComponents,
  getTemplateBody,
  ISP_TEMPLATE_PRESETS,
  isApproved,
  countTemplateVariables,
  renderTemplatePreview,
  validateTemplate,
} from '@/lib/waba/templates';
import { getActiveConnection } from '@/lib/waba/waba.repository';
import {
  assertCanManageWaba,
  ForbiddenError,
  UnauthorizedError,
} from '@/lib/waba/tenant-context';

type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: string; details?: string[] };

function toErrorResult(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof MetaGraphError) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

/* ==========================================================================
 * Lectura
 * ========================================================================== */

export interface TemplateView {
  id: string;
  name: string;
  status: string;
  language: string;
  category: string;
  bodyText: string;
  variableCount: number;
  approved: boolean;
  preview: string;
}

export async function listTemplatesAction(): Promise<
  ActionResult<{ templates: TemplateView[]; approvedCount: number; pendingCount: number }>
> {
  try {
    assertWabaEnv();
    const { organizationId } = await assertCanManageWaba();

    const connection = await getActiveConnection(organizationId);
    if (!connection) {
      return { ok: false, error: 'No hay ningún número de WhatsApp conectado.' };
    }

    const raw = await fetchTemplates(connection.wabaId, connection.accessToken);
    const templates = raw.map(toView);

    return {
      ok: true,
      templates,
      approvedCount: templates.filter((t) => t.approved).length,
      pendingCount: templates.filter((t) => !t.approved).length,
    };
  } catch (error) {
    return toErrorResult(error, 'No se pudieron leer las plantillas.');
  }
}

export async function listApprovedTemplatesAction(): Promise<
  ActionResult<{ templates: TemplateView[] }>
> {
  const result = await listTemplatesAction();
  if (!result.ok) return result;
  return { ok: true, templates: result.templates.filter((t) => t.approved) };
}

function toView(template: WhatsAppTemplateSummary): TemplateView {
  const bodyText = getTemplateBody(template);
  return {
    id: template.id ?? '',
    name: template.name ?? '',
    status: template.status ?? '',
    language: template.language ?? '',
    category: template.category ?? 'UTILITY',
    bodyText,
    variableCount: countTemplateVariables(bodyText),
    approved: isApproved(template),
    preview: bodyText,
  };
}

/* ==========================================================================
 * Creación
 * ========================================================================== */

export interface CreateTemplateInput {
  name: string;
  language: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  bodyText: string;
  headerText?: string;
  footerText?: string;
}

export async function createTemplateAction(
  input: CreateTemplateInput
): Promise<ActionResult<{ id: string | null; name: string; status: string; warnings: string[] }>> {
  try {
    assertWabaEnv();
    const { organizationId } = await assertCanManageWaba();

    const connection = await getActiveConnection(organizationId);
    if (!connection) {
      return { ok: false, error: 'No hay ningún número de WhatsApp conectado.' };
    }

    const validation = validateTemplate(input);
    if (!validation.valid) {
      return {
        ok: false,
        error: 'La plantilla no cumple las reglas de Meta.',
        details: validation.errors,
      };
    }

    const existing = await fetchTemplates(connection.wabaId, connection.accessToken);
    const duplicate = existing.find(
      (t) => t.name === validation.normalizedName && t.language === input.language
    );
    if (duplicate) {
      return {
        ok: false,
        error: `Ya existe una plantilla "${validation.normalizedName}" en ${input.language} (estado: ${duplicate.status}).`,
      };
    }

    const components = buildTemplateComponents({
      bodyText: input.bodyText,
      headerText: input.headerText,
      footerText: input.footerText,
    });

    const result = await createTemplate(connection.wabaId, connection.accessToken, {
      name: validation.normalizedName,
      language: input.language,
      category: input.category,
      components,
    });

    revalidatePath('/dashboard');

    return {
      ok: true,
      id: result.id ?? null,
      name: validation.normalizedName,
      status: result.status ?? 'PENDING',
      warnings: validation.warnings,
    };
  } catch (error) {
    return toErrorResult(error, 'No se pudo crear la plantilla.');
  }
}

export async function createIspPresetTemplatesAction(): Promise<
  ActionResult<{ created: string[]; skipped: string[]; failed: Array<{ name: string; error: string }> }>
> {
  try {
    assertWabaEnv();
    const { organizationId } = await assertCanManageWaba();

    const connection = await getActiveConnection(organizationId);
    if (!connection) {
      return { ok: false, error: 'No hay ningún número de WhatsApp conectado.' };
    }

    const existing = await fetchTemplates(connection.wabaId, connection.accessToken);
    const existingKeys = new Set(existing.map((t) => `${t.name}:${t.language}`));

    const created: string[] = [];
    const skipped: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const preset of ISP_TEMPLATE_PRESETS) {
      if (existingKeys.has(`${preset.name}:${preset.language}`)) {
        skipped.push(preset.name);
        continue;
      }

      const result = await createTemplateAction({
        name: preset.name,
        language: preset.language,
        category: preset.category,
        bodyText: preset.bodyText,
        footerText: 'footerText' in preset ? preset.footerText : undefined,
      });

      if (result.ok) {
        created.push(preset.name);
      } else {
        failed.push({ name: preset.name, error: result.error });
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    revalidatePath('/dashboard');
    return { ok: true, created, skipped, failed };
  } catch (error) {
    return toErrorResult(error, 'No se pudieron crear las plantillas sugeridas.');
  }
}

/* ==========================================================================
 * Eliminación
 * ========================================================================== */

export async function deleteTemplateAction(
  templateName: string
): Promise<ActionResult<{ message: string }>> {
  try {
    assertWabaEnv();
    const { organizationId } = await assertCanManageWaba();

    const connection = await getActiveConnection(organizationId);
    if (!connection) {
      return { ok: false, error: 'No hay ningún número de WhatsApp conectado.' };
    }

    if (!templateName?.trim()) {
      return { ok: false, error: 'Indica el nombre de la plantilla a eliminar.' };
    }

    await deleteTemplate(connection.wabaId, connection.accessToken, templateName.trim());
    revalidatePath('/dashboard');

    return { ok: true, message: `Plantilla "${templateName}" eliminada de tu WABA.` };
  } catch (error) {
    return toErrorResult(error, 'No se pudo eliminar la plantilla.');
  }
}

/* ==========================================================================
 * Utilidades para la UI
 * ========================================================================== */

export async function validateTemplateAction(input: CreateTemplateInput) {
  const validation = validateTemplate(input);
  return {
    ok: true as const,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    normalizedName: validation.normalizedName,
    variableCount: validation.variableCount,
  };
}

export async function previewTemplateAction(bodyText: string, values: string[]) {
  return { ok: true as const, preview: renderTemplatePreview(bodyText, values) };
}

export async function getIspPresetsAction() {
  return {
    ok: true as const,
    presets: ISP_TEMPLATE_PRESETS.map((preset) => ({
      ...preset,
      variableCount: countTemplateVariables(preset.bodyText),
    })),
  };
}
