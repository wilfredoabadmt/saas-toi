'use client';

/**
 * src/components/waba/WebhookInfoCard.tsx
 * ---------------------------------------------------------------------------
 * PANEL 3: Datos de Webhook de Meta (Informativo para el Admin).
 *
 * Visualiza la URL de Callback de tu webhook y el Token de Verificación
 * con botones de "Copiar en 1-Clic" e inputs con estilo `.glass-input-dark`.
 */

import React, { useState } from 'react';

interface Props {
  callbackUrl: string;
  verifyToken: string;
  hasAppSecret?: boolean;
}

export function WebhookInfoCard({ callbackUrl, verifyToken, hasAppSecret = false }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <section
      style={{
        borderRadius: 'var(--radius-2xl, 20px)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        backgroundColor: 'var(--bg-card, rgba(18, 20, 26, 0.65))',
        boxShadow: 'var(--shadow-card, 0 20px 50px rgba(0,0,0,0.5))',
        padding: '1.75rem',
        marginTop: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #F8FAFC)', margin: 0 }}>
            Configuración de Webhook de Meta
          </h2>
          <p style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
            URL de Callback y Token de Verificación para registrar el Webhook en tu App de Meta Developers.
          </p>
        </div>

        <span
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: hasAppSecret ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${hasAppSecret ? '#10b981' : '#f59e0b'}`,
            color: hasAppSecret ? '#34D399' : '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {hasAppSecret ? '✓ Firma HMAC Activa (App Secret)' : '⚠ Firma HMAC opcional'}
        </span>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Callback URL */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            URL de Callback (HTTPS)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              readOnly
              value={callbackUrl}
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-lg, 10px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                backgroundColor: 'rgba(6, 7, 9, 0.75)',
                color: '#F8FAFC',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => copyToClipboard(callbackUrl, 'url')}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-lg, 10px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copiedField === 'url' ? '✓ ¡Copiado!' : 'Copiar URL'}
            </button>
          </div>
        </div>

        {/* Verify Token */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Token de Verificación (Verify Token)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              readOnly
              value={verifyToken}
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-lg, 10px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                backgroundColor: 'rgba(6, 7, 9, 0.75)',
                color: '#F8FAFC',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => copyToClipboard(verifyToken, 'token')}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-lg, 10px)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.2))',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copiedField === 'token' ? '✓ ¡Copiado!' : 'Copiar Token'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
