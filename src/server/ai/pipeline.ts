import { asc, desc, eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  chatbotConversations,
  chatbotMessages,
  agentProfile,
  kbEntry,
  messageLogs,
  type ChatbotConversation,
  type AgentProfile as AgentProfileType,
} from '@/db/schema';
import { assertTenantScope } from '@/lib/tenant';
import { WabaService } from '@/services/waba.service';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { chatJson, isAiConfigured, type ChatMessage } from '@/lib/ai';
import { getAccountSnapshot } from '@/server/ai/account';
import { AgentAction, degradeAction, type AgentActionType } from '@/server/ai/actions';
import {
  detectHandoffIntent,
  handoffFarewell,
  type HandoffReason,
} from '@/server/ai/handoff';
import {
  execCrearTicket,
  execNotaAbonado,
  execRegistrarComprobante,
  execRegistrarPromesa,
} from '@/server/ai/executors';
import { buildAgentSystemPrompt, describeNonTextMessage } from '@/server/ai/prompts';

const HISTORY_LIMIT = 20;

type CoalesceEntry = {
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
  pending: boolean;
};

const globalForAgent = globalThis as unknown as {
  __agentCoalesce?: Map<string, CoalesceEntry>;
};

function coalesceMap(): Map<string, CoalesceEntry> {
  if (!globalForAgent.__agentCoalesce) {
    globalForAgent.__agentCoalesce = new Map();
  }
  return globalForAgent.__agentCoalesce;
}

function coalesceMs(): number {
  const raw = Number(process.env.AGENT_COALESCE_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 6000;
}

export function isWindowOpen(lastInboundAt: Date | string | null | undefined): boolean {
  if (!lastInboundAt) return true;
  const date = lastInboundAt instanceof Date ? lastInboundAt : new Date(lastInboundAt);
  if (Number.isNaN(date.getTime())) return true;
  const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  return diffHours <= 24;
}

/** Punto de entrada con debounce (mensajes entrantes reales). */
export function scheduleAgentTurn(conversationId: string): void {
  const map = coalesceMap();
  const entry = map.get(conversationId) ?? {
    timer: null,
    running: false,
    pending: false,
  };
  map.set(conversationId, entry);

  if (entry.running) {
    entry.pending = true;
    return;
  }
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void executeTurn(conversationId);
  }, coalesceMs());
}

async function executeTurn(conversationId: string): Promise<void> {
  const map = coalesceMap();
  const entry = map.get(conversationId);
  if (!entry || entry.running) return;
  entry.running = true;
  try {
    await runAgentTurn(conversationId);
  } catch (err) {
    console.error('[agente] turno falló:', err);
  } finally {
    entry.running = false;
    if (entry.pending) {
      entry.pending = false;
      void executeTurn(conversationId);
    } else {
      map.delete(conversationId);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* El turno                                                                    */
/* -------------------------------------------------------------------------- */

/** Ejecuta UN turno ahora (sin debounce). Lo usan los tests. */
export async function runAgentTurn(conversationId: string): Promise<void> {
  if (!isAiConfigured()) return;

  // 1. Conversación
  const rows = await db
    .select()
    .from(chatbotConversations)
    .where(eq(chatbotConversations.id, conversationId))
    .limit(1);

  const conversation = rows[0];
  if (!conversation) return;
  const organizationId = assertTenantScope(conversation.organizationId);

  // 2. Condiciones de silencio
  if (conversation.handoffAt) return; // ya está en manos de un agente humano
  if (!conversation.aiEnabled) return; // apagado en esta conversación

  const profileRows = await db
    .select()
    .from(agentProfile)
    .where(eq(agentProfile.organizationId, organizationId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile) return;
  if (!conversation.isTest && !profile.enabled) return; // apagado global

  // 3. Historial
  const history = await db
    .select()
    .from(chatbotMessages)
    .where(eq(chatbotMessages.conversationId, conversationId))
    .orderBy(desc(chatbotMessages.createdAt))
    .limit(HISTORY_LIMIT);
  history.reverse();

  const lastInbound = [...history].reverse().find((m) => m.role === 'user');
  if (!lastInbound) return;

  const lastMedia =
    [...history]
      .reverse()
      .find(
        (m) =>
          m.role === 'user' &&
          typeof m.metadata === 'object' &&
          m.metadata !== null &&
          'type' in m.metadata &&
          (m.metadata.type === 'image' || m.metadata.type === 'document')
      ) ?? null;

  // 4. Ventana de 24h
  if (!conversation.isTest && !isWindowOpen(conversation.lastInboundAt)) {
    await applyHandoff(conversationId, organizationId, 'ventana');
    return;
  }

  // 5. Respaldo de escalado ANTES del LLM
  if (lastInbound.content) {
    const reason = detectHandoffIntent(lastInbound.content);
    if (reason) {
      const farewell = handoffFarewell(reason);
      if (farewell) await deliverReply(conversation, farewell);
      await applyHandoff(conversationId, organizationId, reason);
      return;
    }
  }

  // 6. Contexto verificado
  const kb = await db
    .select()
    .from(kbEntry)
    .where(eq(kbEntry.organizationId, organizationId))
    .orderBy(asc(kbEntry.createdAt));

  const account = await getAccountSnapshot({
    organizationId,
    phone: conversation.phone,
  });

  // 7. Llamada al modelo
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildAgentSystemPrompt({
        profile,
        kb,
        account,
        isTest: conversation.isTest,
      }),
    },
    ...history.flatMap((m) => {
      const text = m.content?.trim();
      const msgType = (m.metadata as { type?: string })?.type || 'text';
      if (text) {
        return [
          {
            role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: text,
          },
        ];
      }
      if (m.role !== 'user') return [];
      return [{ role: 'user' as const, content: describeNonTextMessage(msgType) }];
    }),
  ];

  const result = await chatJson(AgentAction, messages);
  if (!result.ok) {
    if (result.error === 'not_configured') return;
    console.error(`[agente] fallo del proveedor: ${result.error} — ${result.detail}`);
    await applyHandoff(conversationId, organizationId, 'error');
    return;
  }

  // 8. Validación + ejecución
  const mediaId = lastMedia
    ? (lastMedia.metadata as { mediaId?: string })?.mediaId ?? null
    : null;

  await applyAction({
    action: result.data,
    conversation,
    profile,
    account,
    lastMedia: lastMedia
      ? { id: lastMedia.id, mediaId }
      : null,
  });
}

/* -------------------------------------------------------------------------- */
/* Ejecución de la acción                                                      */
/* -------------------------------------------------------------------------- */

type Account = Awaited<ReturnType<typeof getAccountSnapshot>>;

async function applyAction(input: {
  action: AgentActionType;
  conversation: ChatbotConversation;
  profile: AgentProfileType;
  account: Account;
  lastMedia: { id: string; mediaId: string | null } | null;
}): Promise<void> {
  const { conversation, profile, account } = input;
  let action = input.action;

  const needsSubscriber =
    action.action === 'registrar_promesa_pago' ||
    action.action === 'crear_ticket' ||
    action.action === 'registrar_comprobante' ||
    action.action === 'nota_abonado';

  if (needsSubscriber && !account.subscriberId) {
    action = degradeAction(action);
  }

  const ctx = {
    organizationId: conversation.organizationId,
    conversationId: conversation.id,
    subscriberId: account.subscriberId ?? '',
    profile: {
      allowPaymentPromise: profile.allowPaymentPromise,
      allowTicketCreation: profile.allowTicketCreation,
      allowReceiptCapture: profile.allowReceiptCapture,
      maxPromiseDays: profile.maxPromiseDays,
    },
  };

  switch (action.action) {
    case 'none':
      return;

    case 'reply':
      await deliverReply(conversation, action.text);
      return;

    case 'nota_abonado': {
      const res = await execNotaAbonado(ctx, action);
      if (!res.ok) console.warn(`[agente] nota descartada: ${res.reason}`);
      if (action.reply) await deliverReply(conversation, action.reply);
      return;
    }

    case 'registrar_promesa_pago': {
      const res = await execRegistrarPromesa(ctx, action);
      if (!res.ok) {
        console.warn(`[agente] promesa rechazada: ${res.reason}`);
        await deliverReply(conversation, action.reply);
        return;
      }
      await deliverReply(conversation, action.reply);
      return;
    }

    case 'crear_ticket': {
      const res = await execCrearTicket(ctx, action);
      if (!res.ok) {
        console.warn(`[agente] ticket rechazado: ${res.reason}`);
        await deliverReply(conversation, action.reply);
        await applyHandoff(
          conversation.id,
          conversation.organizationId,
          'modelo'
        );
        return;
      }
      await deliverReply(conversation, action.reply);
      return;
    }

    case 'registrar_comprobante': {
      const res = await execRegistrarComprobante(ctx, action, input.lastMedia);
      if (!res.ok) {
        console.warn(`[agente] comprobante rechazado: ${res.reason}`);
        await deliverReply(
          conversation,
          'Para registrar tu pago necesito la foto o captura del comprobante. ¿Me la puedes enviar?'
        );
        return;
      }
      await deliverReply(conversation, action.reply);
      return;
    }

    case 'handoff': {
      if (action.farewell) await deliverReply(conversation, action.farewell);
      await applyHandoff(conversation.id, conversation.organizationId, 'modelo');
      return;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Entrega y escalado                                                          */
/* -------------------------------------------------------------------------- */

async function deliverReply(
  conversation: ChatbotConversation,
  text: string
): Promise<void> {
  if (conversation.isTest) {
    await persistTestOutbound(conversation, text);
    return;
  }

  try {
    const creds = await WabaService.getDecryptedTokenInternal(conversation.organizationId);
    const result = await WhatsAppClient.sendTextMessage({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.token,
      toPhone: conversation.phone,
      text,
    });

    // Registrar en chatbot_messages
    await db.insert(chatbotMessages).values({
      conversationId: conversation.id,
      role: 'assistant',
      content: text,
      metadata: { wamid: result.wamid },
    });

    // Registrar en message_logs
    if (conversation.subscriberId) {
      await db.insert(messageLogs).values({
        organizationId: conversation.organizationId,
        subscriberId: conversation.subscriberId,
        wamid: result.wamid,
        direction: 'outbound',
        messageType: 'text',
        contentPreview: text,
        deliveryStatus: 'sent',
      });
    }
  } catch (err) {
    console.error('[agente] envío falló:', err);
    await applyHandoff(conversation.id, conversation.organizationId, 'error');
  }
}

async function persistTestOutbound(
  conversation: ChatbotConversation,
  text: string
): Promise<void> {
  await db.insert(chatbotMessages).values({
    conversationId: conversation.id,
    role: 'assistant',
    content: text,
    metadata: { isTest: true },
  });
  await db
    .update(chatbotConversations)
    .set({ endedAt: null })
    .where(eq(chatbotConversations.id, conversation.id));
}

export async function applyHandoff(
  conversationId: string,
  organizationId: string,
  reason: HandoffReason
): Promise<void> {
  const orgId = assertTenantScope(organizationId);

  await db
    .update(chatbotConversations)
    .set({
      status: 'transferred',
      handoffAt: new Date(),
      handoffReason: reason,
    })
    .where(
      and(
        eq(chatbotConversations.id, conversationId),
        eq(chatbotConversations.organizationId, orgId)
      )
    );
}
