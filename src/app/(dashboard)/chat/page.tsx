import { ChatInbox } from '@/components/domain/chat-inbox';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', margin: 0 }}>
          Inbox & Atención Multi-Agente
        </h1>
        <p style={{ color: '#64748b', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Conversaciones de WhatsApp en tiempo real con ficha de abonado y plan de internet en vivo
        </p>
      </div>

      <ChatInbox />
    </div>
  );
}
