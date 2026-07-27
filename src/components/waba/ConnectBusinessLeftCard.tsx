'use client';

/**
 * src/components/waba/ConnectBusinessLeftCard.tsx
 * ---------------------------------------------------------------------------
 * COLUMNA IZQUIERDA: "1. Connect a business number"
 * Renderiza:
 *   · Botón prominente verde glossy "Connect with Meta" (#25D366)
 *   · Tarjeta PERMISSION COVERAGE (Management & Messaging scopes)
 *   · Tarjeta RECORDING NOTE para screencasts de App Review de Meta
 */

import React from 'react';
import { EmbeddedSignupButton } from './EmbeddedSignupButton';

interface Props {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export function ConnectBusinessLeftCard({ onSuccess, onError }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* Tarjeta Principal de Inicio de Sesión */}
      <section
        style={{
          borderRadius: 'var(--radius-2xl, 20px)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          backgroundColor: 'var(--bg-card, rgba(18, 20, 26, 0.65))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-card, 0 20px 50px rgba(0,0,0,0.5))',
          padding: '1.75rem',
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              fontWeight: 800,
              color: '#34D399',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.35rem',
            }}
          >
            Step 1
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #F8FAFC)', margin: 0, letterSpacing: '-0.02em' }}>
            1. Connect a business number
          </h2>
          <p style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.85rem', margin: '0.35rem 0 0 0', lineHeight: 1.4 }}>
            Click the glossy button below to launch Meta Embedded Signup, pick your Business account, and link your WhatsApp number in 1-Click.
          </p>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <EmbeddedSignupButton
            label="Connect with Meta"
            onSuccess={onSuccess}
            onError={onError}
          />
        </div>
      </section>

      {/* Tarjeta PERMISSION COVERAGE */}
      <section
        style={{
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          padding: '1.25rem',
        }}
      >
        <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #F8FAFC)', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Permission Coverage
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted, #94A3B8)', lineHeight: 1.45 }}>
          <li>
            <strong style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>whatsapp_business_management</strong>: Read connected phone number details, line quality, and approved templates from Meta Graph API.
          </li>
          <li>
            <strong style={{ color: '#F8FAFC', fontFamily: 'monospace' }}>whatsapp_business_messaging</strong>: Send real payment reminder templates and notifications to subscribers from the connected phone number.
          </li>
        </ul>
      </section>

      {/* Tarjeta RECORDING NOTE */}
      <section
        style={{
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>📹</span>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#93C5FD', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recording Note for Meta Reviewer
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#DBEAFE', lineHeight: 1.45 }}>
          This interface is fully optimized for Meta App Review screencasts. It demonstrates 1-Click Embedded Signup onboarding, real-time Graph API asset retrieval, template management, and live webhook message delivery.
        </p>
      </section>
    </div>
  );
}
