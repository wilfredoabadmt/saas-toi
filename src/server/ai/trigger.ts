import { isAiConfigured } from '@/lib/ai';
import { scheduleAgentTurn } from '@/server/ai/pipeline';

/**
 * ÚNICO punto de enganche del agente.
 *
 * Llámalo AL FINAL de tu ingesta de mensajes entrantes, después de haber
 * commiteado el mensaje:
 *
 *   await maybeRunAgentTurn(conversationId);
 *
 * No lanza nunca y no bloquea la respuesta al webhook de Meta: agenda el turno
 * con debounce y devuelve.
 */
export async function maybeRunAgentTurn(conversationId: string): Promise<void> {
  if (!isAiConfigured()) return;
  scheduleAgentTurn(conversationId);
}
