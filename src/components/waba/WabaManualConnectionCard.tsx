'use client';

/**
 * src/components/waba/WabaManualConnectionCard.tsx
 * ---------------------------------------------------------------------------
 * Formulario manual de conexión y credenciales Meta WhatsApp Business API.
 * Replica exactamente la interfaz de configuración solicitada:
 *   · Secciones: "Reconectar / actualizar el número" y "Webhook de WhatsApp"
 *   · Info Box: "¿De dónde sale el token?" (Modo directo vs Modo agencia)
 *   · Inputs: WABA ID, Phone Number ID, Token de acceso
 *   · Botones: Probar conexión, Guardar conexión
 *   · Webhook: URL del webhook (callback URL) con botón de copiar y Verify token
 */

import React, { useState, useTransition } from 'react';
import {
  saveManualConnectionAction,
  testConnectionCredentialsAction,
} from '@/app/actions/waba.actions';

interface Props {
  initialWabaId?: string;
  initialPhoneNumberId?: string;
  callbackUrl: string;
  verifyToken: string;
  hasAppSecret?: boolean;
}

export function WabaManualConnectionCard({
  initialWabaId = '',
  initialPhoneNumberId = '',
  callbackUrl,
  verifyToken,
  hasAppSecret = false,
}: Props) {
  const [wabaId, setWabaId] = useState(initialWabaId);
  const [phoneNumberId, setPhoneNumberId] = useState(initialPhoneNumberId);
  const [accessToken, setAccessToken] = useState('');
  const [isPending, startTransition] = useTransition();

  const [copiedField, setCopiedField] = useState<'url' | 'token' | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const handleCopy = async (text: string, field: 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback si clipboard API no está disponible
    }
  };

  const handleTest = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await testConnectionCredentialsAction({
        wabaId,
        phoneNumberId,
        accessToken,
      });

      if (res.ok) {
        setFeedback({
          tone: 'ok',
          text: `Conexión exitosa con Meta${res.displayPhone ? ` (${res.displayPhone})` : ''}${res.verifiedName ? ` — ${res.verifiedName}` : ''}. Credenciales válidas.`,
        });
      } else {
        setFeedback({ tone: 'error', text: res.error });
      }
    });
  };

  const handleSave = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await saveManualConnectionAction({
        wabaId,
        phoneNumberId,
        accessToken,
      });

      if (res.ok) {
        setFeedback({
          tone: 'ok',
          text: `¡Conexión guardada exitosamente! Número activo: ${res.displayPhone ?? phoneNumberId}.`,
        });
        setAccessToken('');
      } else {
        setFeedback({ tone: 'error', text: res.error });
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
      {/* ------------------------------------------------------------------- */}
      {/* SECCIÓN 1: Reconectar / actualizar el número                        */}
      {/* ------------------------------------------------------------------- */}
      <section style={{
        borderRadius: 'var(--radius-2xl, 1rem)',
        border: '1px solid var(--border-color, #e5e7eb)',
        backgroundColor: 'var(--bg-card, #ffffff)',
        boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05))',
        padding: '1.75rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #111827)', margin: 0 }}>
          Reconectar / actualizar el número
        </h2>
        <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.88rem', margin: '0.35rem 0 1.25rem 0' }}>
          Pega las credenciales de WhatsApp Cloud API. El token se valida contra Meta ANTES de guardarse y se almacena cifrado.
        </p>

        {/* Info Box: ¿De dónde sale el token? */}
        <div style={{
          padding: '1.25rem',
          borderRadius: 'var(--radius-xl, 0.75rem)',
          border: '1px solid rgba(217, 119, 6, 0.25)',
          backgroundColor: 'rgba(253, 246, 227, 0.5)',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b45309', margin: '0 0 0.75rem 0' }}>
            ¿De dónde sale el token?
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
            <div>
              <strong style={{ fontSize: '0.85rem', color: '#b45309', display: 'block', marginBottom: '0.25rem' }}>
                Modo directo
              </strong>
              <p style={{ fontSize: '0.82rem', color: '#78350f', margin: 0, lineHeight: 1.45 }}>
                El negocio tiene su propia app en <strong>developers.facebook.com</strong>: usa un token de usuario del sistema (no expira) con permisos de WhatsApp. En este modo conviene configurar también el App Secret para la firma del webhook.
              </p>
            </div>

            <div>
              <strong style={{ fontSize: '0.85rem', color: '#b45309', display: 'block', marginBottom: '0.25rem' }}>
                Modo agencia (Tech Provider)
              </strong>
              <p style={{ fontSize: '0.82rem', color: '#78350f', margin: 0, lineHeight: 1.45 }}>
                Tu agencia hace el Embedded Signup en SU plataforma y su backend obtiene el token del cliente; te lo entrega para pegarlo aquí. El webhook se conecta con el <strong>override por WABA</strong> (checklist de 5 pasos en el README).
              </p>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #374151)' }}>
                WABA ID
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="ID de la cuenta de WhatsApp Business"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-lg, 0.5rem)',
                  border: '1px solid var(--border-color, #d1d5db)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #111827)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #374151)' }}>
                Phone Number ID
              </label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="ID del número de teléfono"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-lg, 0.5rem)',
                  border: '1px solid var(--border-color, #d1d5db)',
                  backgroundColor: 'var(--bg-input, #ffffff)',
                  color: 'var(--text-main, #111827)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #374151)' }}>
              Token de acceso
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Guardado (...ZDZD) — pega uno nuevo para cambiarlo"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-lg, 0.5rem)',
                border: '1px solid var(--border-color, #d1d5db)',
                backgroundColor: 'var(--bg-input, #ffffff)',
                color: 'var(--text-main, #111827)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Feedback message */}
          {feedback && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg, 0.5rem)',
              border: `1px solid ${feedback.tone === 'ok' ? '#10b981' : '#ef4444'}`,
              backgroundColor: feedback.tone === 'ok' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: feedback.tone === 'ok' ? '#065f46' : '#991b1b',
              fontSize: '0.88rem',
            }}>
              {feedback.text}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={isPending || (!accessToken && !phoneNumberId)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: 'var(--radius-lg, 0.5rem)',
                border: '1px solid var(--border-color, #d1d5db)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #374151)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? 'Probando...' : 'Probar conexión'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !wabaId || !phoneNumberId}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: 'var(--radius-lg, 0.5rem)',
                border: 'none',
                backgroundColor: '#d97706',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {isPending ? 'Guardando...' : 'Guardar conexión'}
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* SECCIÓN 2: Webhook de WhatsApp                                      */}
      {/* ------------------------------------------------------------------- */}
      <section style={{
        borderRadius: 'var(--radius-2xl, 1rem)',
        border: '1px solid var(--border-color, #e5e7eb)',
        backgroundColor: 'var(--bg-card, #ffffff)',
        boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0,0,0,0.05))',
        padding: '1.75rem',
      }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #111827)', margin: 0 }}>
          Webhook de WhatsApp
        </h2>
        <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.88rem', margin: '0.35rem 0 1.25rem 0', lineHeight: 1.5 }}>
          Pega estos valores en el panel de Meta (modo directo) o úsalos en el override de tu backend de agencia (a nivel WABA). <strong>Guarda la conexión ANTES de configurar el webhook:</strong> la verificación (handshake) funciona sin guardar, pero los mensajes solo se reciben si la conexión está guardada — se enrutan por tu PhoneNumber ID.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Callback URL */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #374151)' }}>
              URL del webhook (callback URL)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={callbackUrl}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-lg, 0.5rem)',
                  border: '1px solid var(--border-color, #d1d5db)',
                  backgroundColor: 'var(--bg-input-readonly, #f9fafb)',
                  color: 'var(--text-main, #111827)',
                  fontSize: '0.88rem',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => handleCopy(callbackUrl, 'url')}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-lg, 0.5rem)',
                  border: '1px solid var(--border-color, #d1d5db)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  color: copiedField === 'url' ? '#10b981' : 'var(--text-main, #374151)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copiedField === 'url' ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)', margin: '0.35rem 0 0 0' }}>
              La URL contiene el token secreto en la ruta: trátala como una contraseña.
            </p>
          </div>

          {/* Verify Token */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main, #374151)' }}>
              Verify token
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={verifyToken}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-lg, 0.5rem)',
                  border: '1px solid var(--border-color, #d1d5db)',
                  backgroundColor: 'var(--bg-input-readonly, #f9fafb)',
                  color: 'var(--text-main, #111827)',
                  fontSize: '0.88rem',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => handleCopy(verifyToken, 'token')}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-lg, 0.5rem)',
                  border: '1px solid var(--border-color, #d1d5db)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  color: copiedField === 'token' ? '#10b981' : 'var(--text-main, #374151)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copiedField === 'token' ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Bottom Info note */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
            marginTop: '0.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted, #6b7280)',
          }}>
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>ⓘ</span>
            <span>
              {hasAppSecret
                ? 'App Secret configurado: los webhooks entrantes están validados con firma HMAC (X-Hub-Signature-256).'
                : 'Sin App Secret configurado: el webhook queda protegido por la URL secreta (normal en modo agencia). Para la capa extra de firma, agrega META_APP_SECRET a la instancia.'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
