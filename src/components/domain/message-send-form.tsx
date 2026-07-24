'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast-provider';

export function MessageSendForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const { addToast } = useToast();

  const handleSendAllOverdue = async () => {
    setIsSubmitting(true);
    setResultMsg(null);

    try {
      const subRes = await fetch('/api/subscribers?paymentStatus=overdue');
      const subJson = await subRes.json();

      const overdueSubscribers = subJson.data || [];
      const overdueIds = overdueSubscribers.map((s: { id: string }) => s.id);

      if (overdueIds.length === 0) {
        setResultMsg('ℹ️ No hay abonados con estado Vencido en este momento.');
        setIsSubmitting(false);
        return;
      }

      const sendRes = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberIds: overdueIds }),
      });

      const sendJson = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendJson.message || 'Error al enviar notificaciones');
      }

      setResultMsg(`✅ Proceso ejecutado con éxito: ${sendJson.data.sent} avisos enviados de ${sendJson.data.totalRequested} abonados.`);
      addToast(`${sendJson.data.sent} avisos enviados exitosamente`, 'success');
    } catch (err) {
      setResultMsg(`⚠️ ${(err as Error).message}`);
      addToast((err as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.75rem', maxWidth: '650px', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.75rem' }}>📣</span>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Gatillar Recordatorio de Cobranza (Utility Template)
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Envío automatizado bajo políticas oficiales de Meta</span>
        </div>
      </div>

      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
        El sistema filtrará automáticamente a los abonados en opt-out y respetará la tasa máxima de envío (sliding window rate limiter de 80 msg/min por tenant).
      </p>

      <button
        onClick={handleSendAllOverdue}
        disabled={isSubmitting}
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '0.8rem 1.25rem' }}
      >
        <span>🚀</span> {isSubmitting ? 'Procesando Envíos en Cola...' : 'Enviar Avisos Utility a Abonados Vencidos'}
      </button>

      {resultMsg && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 500 }}>
          {resultMsg}
        </div>
      )}
    </div>
  );
}
