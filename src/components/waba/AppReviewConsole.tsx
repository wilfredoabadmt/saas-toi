'use client';

/**
 * src/components/waba/AppReviewConsole.tsx
 * ---------------------------------------------------------------------------
 * WhatsApp App Review Console & Gestor de Plantillas de Mensajes.
 * Diseñada para grabaciones de screencast de revisión de Meta y pruebas operativas:
 *
 *   · Bloque 1: Estado de Conexión e Indicadores de Permisos
 *   · Bloque 2: Creador de Plantillas Oficiales (UTILITY / MARKETING)
 *   · Bloque 3: Sincronizador y Tabla Glassmorphic de Plantillas (APPROVED/PENDING/REJECTED)
 *   · Bloque 4: Enviar Mensaje de Prueba Live con seguimiento de entrega
 */

import React, { useEffect, useState, useTransition } from 'react';
import {
  createTemplateAction,
  fetchLiveTemplatesAction,
  getMessageStatus,
  sendTemplateAction,
} from '@/app/actions/waba.actions';
import type { WhatsAppTemplateSummary } from '@/lib/waba/graph-client';

interface Props {
  wabaId?: string;
  phoneNumberId?: string;
  displayPhone?: string | null;
  isConnected: boolean;
  initialTemplates?: WhatsAppTemplateSummary[];
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;
const FINAL_STATUSES = new Set(['delivered', 'read', 'failed']);

export function AppReviewConsole({
  wabaId,
  phoneNumberId,
  displayPhone,
  isConnected,
  initialTemplates = [],
}: Props) {
  const [templates, setTemplates] = useState<WhatsAppTemplateSummary[]>(initialTemplates);
  const [isPending, startTransition] = useTransition();

  // Feedback global
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // Form Creador de plantillas
  const [tplName, setTplName] = useState('recordatorio_pago');
  const [tplCategory, setTplCategory] = useState<'UTILITY' | 'MARKETING'>('UTILITY');
  const [tplLanguage, setTplLanguage] = useState('es');
  const [tplBody, setTplBody] = useState('Hola {{1}}, tu servicio de Internet vencerá el {{2}}. Saldo: {{3}}.');
  const [tplExamples, setTplExamples] = useState('Carlos Pérez, 15 de Agosto, Bs. 150');

  // Form Prueba de Envío Live
  const [testPhone, setTestPhone] = useState('');
  const [testTemplate, setTestTemplate] = useState('recordatorio_pago');
  const [testLanguage, setTestLanguage] = useState('es');
  const [testParams, setTestParams] = useState('Carlos Pérez\n15 de Agosto\nBs. 150');
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);

  // Polling de entregas tras mensaje de prueba
  useEffect(() => {
    if (!pendingMessageId) return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      const response = await getMessageStatus(pendingMessageId);
      if (cancelled || !response.ok || !response.event) return;

      const status = response.event.deliveryStatus.toLowerCase();
      if (!FINAL_STATUSES.has(status)) return;

      if (status === 'failed') {
        setFeedback({
          tone: 'error',
          text: `Meta aceptó el mensaje, pero la entrega falló${
            response.event.errorCode ? ` (${response.event.errorCode})` : ''
          }${response.event.failureReason ? `: ${response.event.failureReason}` : '.'}`,
        });
      } else {
        setFeedback({
          tone: 'ok',
          text: `✅ Confirmación final Meta: Estado "${status.toUpperCase()}". El circuito completo (Envío → Webhook Meta → DB) funciona.`,
        });
      }
      setPendingMessageId(null);
    };

    const interval = setInterval(() => {
      attempts += 1;
      if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(interval);
        if (!cancelled) {
          setPendingMessageId(null);
          setFeedback({
            tone: 'error',
            text: 'Meta aceptó el mensaje pero no se recibió actualización de entrega por webhook.',
          });
        }
        return;
      }
      void poll();
    }, POLL_INTERVAL_MS);

    void poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pendingMessageId]);

  // Sincronizar plantillas desde Meta
  const handleSyncTemplates = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await fetchLiveTemplatesAction();
      if (res.ok) {
        setTemplates(res.templates);
        setFeedback({
          tone: 'ok',
          text: `Sincronización exitosa: ${res.templates.length} plantilla(s) cargadas desde Meta.`,
        });
      } else {
        setFeedback({ tone: 'error', text: res.error });
      }
    });
  };

  // Crear Plantilla
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const examplesArray = tplExamples.split(',').map((s) => s.trim()).filter(Boolean);

    startTransition(async () => {
      const res = await createTemplateAction({
        name: tplName,
        category: tplCategory,
        language: tplLanguage,
        bodyText: tplBody,
        exampleVariables: examplesArray,
      });

      if (res.ok) {
        setFeedback({
          tone: 'ok',
          text: `Plantilla "${tplName}" enviada a Meta con éxito. Estado: ${res.status}.`,
        });
        handleSyncTemplates();
      } else {
        setFeedback({ tone: 'error', text: res.error });
      }
    });
  };

  // Enviar Prueba
  const handleSendTest = () => {
    setFeedback(null);
    setPendingMessageId(null);

    startTransition(async () => {
      const res = await sendTemplateAction({
        recipientPhone: testPhone,
        templateName: testTemplate,
        languageCode: testLanguage,
        bodyParameters: testParams.split('\n').map((v) => v.trim()).filter(Boolean),
      });

      if (res.ok) {
        setFeedback({
          tone: 'ok',
          text: `Meta aceptó el mensaje de prueba para ${res.recipientWaId}. Esperando webhook de entrega...`,
        });
        if (res.messageId) setPendingMessageId(res.messageId);
      } else {
        setFeedback({ tone: 'error', text: res.error });
      }
    });
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-2xl, 20px)',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
    backgroundColor: 'var(--bg-card, rgba(18, 20, 26, 0.65))',
    boxShadow: 'var(--shadow-card, 0 20px 50px rgba(0,0,0,0.5))',
    padding: '1.75rem',
    marginTop: '1.5rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius-lg, 10px)',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
    backgroundColor: 'var(--bg-main, rgba(6, 7, 9, 0.75))',
    color: 'var(--text-main, #F8FAFC)',
    fontSize: '0.88rem',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-xl, 14px)',
            border: `1px solid ${feedback.tone === 'ok' ? '#10b981' : '#f43f5e'}`,
            backgroundColor: feedback.tone === 'ok' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: feedback.tone === 'ok' ? '#34D399' : '#FB7185',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* BLOQUE 1: Estado de Conexión e Indicadores de Permisos              */}
      {/* ------------------------------------------------------------------- */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Estado de la Conexión & Permisos de Meta
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
              Consola de verificación técnica para screencast de App Review de Meta.
            </p>
          </div>

          <span
            style={{
              padding: '0.3rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
              border: `1px solid ${isConnected ? '#10b981' : '#f43f5e'}`,
              color: isConnected ? '#34D399' : '#FB7185',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            {isConnected ? '✓ CANAL ACTIVO EN META' : '⚠ CANAL NO CONECTADO'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
          <InfoTile label="WABA ID" value={wabaId || '—'} />
          <InfoTile label="Phone Number ID" value={phoneNumberId || '—'} />
          <InfoTile label="Número Visible" value={displayPhone || '—'} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem' }}>
          <PermissionBadge name="whatsapp_business_management" active={isConnected} />
          <PermissionBadge name="whatsapp_business_messaging" active={isConnected} />
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* BLOQUE 2: Creador de Plantillas Oficiales                           */}
      {/* ------------------------------------------------------------------- */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Creador de Plantillas en Meta Cloud API
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 1.25rem 0' }}>
          Envía nuevas plantillas directamente a revisión oficial de Meta para avisos de cobro y soporte.
        </p>

        <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Nombre de la Plantilla (minusculas)
              </label>
              <input
                type="text"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="ej: aviso_factura_mensual"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Categoría Meta
              </label>
              <select
                value={tplCategory}
                onChange={(e) => setTplCategory(e.target.value as 'UTILITY' | 'MARKETING')}
                style={inputStyle}
              >
                <option value="UTILITY">UTILITY (Avisos de pago, alertas)</option>
                <option value="MARKETING">MARKETING (Promociones)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Idioma
              </label>
              <select value={tplLanguage} onChange={(e) => setTplLanguage(e.target.value)} style={inputStyle}>
                <option value="es">Español (es)</option>
                <option value="en">Inglés (en)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Cuerpo del Mensaje (admite variables &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;)
            </label>
            <textarea
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              rows={3}
              required
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Valores de Ejemplo para Revisión de Meta (separados por coma)
            </label>
            <input
              type="text"
              value={tplExamples}
              onChange={(e) => setTplExamples(e.target.value)}
              placeholder="Juan Pérez, 15/08/2026, Bs. 150"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={isPending || !isConnected}
            className="btn-whatsapp-glossy"
            style={{ alignSelf: 'flex-start' }}
          >
            {isPending ? 'Enviando a Meta...' : 'Crear Plantilla en Meta'}
          </button>
        </form>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* BLOQUE 3: Tabla Glassmorphic de Plantillas Sincronizadas            */}
      {/* ------------------------------------------------------------------- */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Plantillas Sincronizadas ({templates.length})
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              Lista de plantillas aprobadas y en revisión leídas directamente desde la WABA de Meta.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncTemplates}
            disabled={isPending || !isConnected}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isPending ? 'Sincronizando...' : '↻ Sincronizar'}
          </button>
        </div>

        {templates.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
            No hay plantillas sincronizadas. Haz clic en &quot;Sincronizar&quot; o crea una nueva arriba.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: 'var(--text-main)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Nombre</th>
                  <th style={{ padding: '0.75rem' }}>Categoría</th>
                  <th style={{ padding: '0.75rem' }}>Idioma</th>
                  <th style={{ padding: '0.75rem' }}>Estado Meta</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t, idx) => (
                  <tr key={t.id || t.name || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>{t.name}</td>
                    <td style={{ padding: '0.75rem' }}>{t.category}</td>
                    <td style={{ padding: '0.75rem' }}>{t.language}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* BLOQUE 4: Enviar Mensaje de Prueba Live                             */}
      {/* ------------------------------------------------------------------- */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Enviar Mensaje de Prueba Live
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.35rem 0 1.25rem 0' }}>
          Prueba el circuito completo: Envío → Meta Graph API → Webhook entrante.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Teléfono Receptor (formato E.164)
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="59171234567"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Plantilla Aprobada
              </label>
              <input
                type="text"
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
                placeholder="recordatorio_pago"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Idioma
              </label>
              <input
                type="text"
                value={testLanguage}
                onChange={(e) => setTestLanguage(e.target.value)}
                placeholder="es"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Variables (una por línea)
            </label>
            <textarea
              value={testParams}
              onChange={(e) => setTestParams(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={isPending || !isConnected || !testPhone}
            className="btn-whatsapp-glossy"
            style={{ alignSelf: 'flex-start' }}
          >
            {isPending ? 'Enviando...' : 'Enviar Recordatorio de Prueba'}
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '0.85rem',
        borderRadius: 'var(--radius-xl, 14px)',
        border: '1px solid var(--border-color)',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
      }}
    >
      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  );
}

function PermissionBadge({ name, active }: { name: string; active: boolean }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.85rem',
        borderRadius: '9999px',
        border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}`,
        backgroundColor: active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
        fontSize: '0.78rem',
        color: active ? '#34D399' : 'var(--text-muted)',
      }}
    >
      <span>{active ? '✓' : '○'}</span>
      <span style={{ fontFamily: 'monospace' }}>{name}</span>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = status?.toUpperCase() || 'UNKNOWN';
  const isApproved = s === 'APPROVED';
  const isPending = s === 'PENDING' || s === 'IN_APPEAL';

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: isApproved ? 'rgba(16,185,129,0.15)' : isPending ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)',
        color: isApproved ? '#34D399' : isPending ? '#fbbf24' : '#FB7185',
        border: `1px solid ${isApproved ? '#10b981' : isPending ? '#f59e0b' : '#f43f5e'}`,
      }}
    >
      {s}
    </span>
  );
}
