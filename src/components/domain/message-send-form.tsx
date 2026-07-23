'use client';

import React, { useState } from 'react';

export function MessageSendForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleSendAllOverdue = async () => {
    setIsSubmitting(true);
    setResultMsg(null);

    try {
      // 1. Fetch subscribers to get overdue list
      const subRes = await fetch('/api/subscribers?paymentStatus=overdue');
      const subJson = await subRes.json();

      const overdueIds = (subJson.data || []).map((s: { id: string }) => s.id);

      if (overdueIds.length === 0) {
        setResultMsg('No hay abonados vencidos en este momento.');
        setIsSubmitting(false);
        return;
      }

      // 2. Send reminders
      const sendRes = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberIds: overdueIds }),
      });

      const sendJson = await sendRes.json();
      if (!sendRes.ok) {
        throw new Error(sendJson.message || 'Error al enviar notificaciones');
      }

      setResultMsg(`✅ Enviados: ${sendJson.data.sent} de ${sendJson.data.totalRequested} abonados.`);
    } catch (err) {
      setResultMsg(`⚠️ ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Gatillar Recordatorio de Cobranza (Utility Template)</h3>
      <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem' }}>
        Envía notificaciones de aviso de pago personalizadas a todos los abonados con cartera vencida o por vencer.
      </p>

      <button
        onClick={handleSendAllOverdue}
        disabled={isSubmitting}
        style={{
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          padding: '0.75rem 1.25rem',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        📣 {isSubmitting ? 'Enviando notificaciones...' : 'Enviar Avisos a Abonados Vencidos'}
      </button>

      {resultMsg && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '0.9rem' }}>
          {resultMsg}
        </div>
      )}
    </div>
  );
}
