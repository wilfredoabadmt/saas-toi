'use client';

/**
 * src/components/waba/CurrentConnectionCard.tsx
 * ---------------------------------------------------------------------------
 * COLUMNA DERECHA: "Current Connection"
 * Muestra en tiempo real los activos vinculados desde Meta:
 *   · Business Display Name
 *   · Phone Number (+E.164)
 *   · Phone Number ID y WABA ID
 *   · Quality Rating (GREEN / YELLOW / RED)
 *   · Account Status / Verification Status (VERIFIED / APPROVED)
 *   · Botón "Refresh Data" en la esquina superior derecha
 *   · Soporta Estados: Loading, Disconnected, Connected & Active
 */

import React from 'react';

interface Props {
  isConnected: boolean;
  isLoading?: boolean;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  displayPhone?: string | null;
  verifiedName?: string | null;
  qualityRating?: string | null;
  verificationStatus?: string | null;
  onRefresh?: () => void;
}

export function CurrentConnectionCard({
  isConnected,
  isLoading = false,
  wabaId,
  phoneNumberId,
  displayPhone,
  verifiedName,
  qualityRating = 'GREEN',
  verificationStatus = 'VERIFIED',
  onRefresh,
}: Props) {
  return (
    <section
      style={{
        borderRadius: 'var(--radius-2xl, 20px)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
        backgroundColor: 'var(--bg-card, rgba(18, 20, 26, 0.65))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-card, 0 20px 50px rgba(0,0,0,0.5))',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header con título y botón Refresh */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #F8FAFC)', margin: 0, letterSpacing: '-0.02em' }}>
            Current Connection
          </h2>
          <p style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.82rem', margin: '0.35rem 0 0 0', lineHeight: 1.4 }}>
            This section proves the number was linked and the app can read WhatsApp assets from Meta.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '9999px',
              border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: '#F8FAFC',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'inline-block', animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        )}
      </div>

      {/* ESTADO 1: CARGANDO */}
      {isLoading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0' }}>
          <NeonSpinner />
          <p style={{ marginTop: '1rem', color: '#34D399', fontSize: '0.88rem', fontWeight: 600 }}>
            Loading connection data from Meta Graph API...
          </p>
        </div>
      ) : !isConnected || !displayPhone ? (
        /* ESTADO 2: SIN CONECTAR (Disconnected) */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem 1rem',
            borderRadius: 'var(--radius-xl, 14px)',
            border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.12))',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              color: '#FB7185',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
            }}
          >
            ● Disconnected
          </span>

          <WhatsAppDisconnectedIcon />

          <p style={{ marginTop: '1rem', fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '22rem', lineHeight: 1.4 }}>
            No WABA assets linked yet. Click <strong>&quot;Connect with Meta&quot;</strong> on the left panel to start onboarding.
          </p>
        </div>
      ) : (
        /* ESTADO 3: CONECTADO (Live Assets) */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          {/* Badge Connected & Active centelleante */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                fontSize: '0.78rem',
                fontWeight: 700,
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#34D399',
                  boxShadow: '0 0 8px #34D399',
                  display: 'inline-block',
                }}
              />
              Connected & Active
            </span>
          </div>

          {/* Grilla de Activos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            <AssetBox label="Business Display Name" value={verifiedName || 'Meta Verified Account'} highlight />
            <AssetBox label="Phone Number" value={displayPhone || '—'} mono />
            <AssetBox label="WABA ID" value={wabaId || '—'} mono />
            <AssetBox label="Phone Number ID" value={phoneNumberId || '—'} mono />
            <AssetBox label="Quality Rating" value={qualityRating?.toUpperCase() || 'GREEN'} badgeTone={qualityRatingTone(qualityRating)} />
            <AssetBox label="Verification Status" value={verificationStatus?.toUpperCase() || 'VERIFIED'} badgeTone="success" />
          </div>
        </div>
      )}
    </section>
  );
}

function AssetBox({
  label,
  value,
  mono = false,
  highlight = false,
  badgeTone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  badgeTone?: 'success' | 'warning' | 'danger';
}) {
  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        borderRadius: 'var(--radius-xl, 14px)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {badgeTone ? (
        <span
          style={{
            display: 'inline-block',
            marginTop: '0.35rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: badgeTone === 'success' ? 'rgba(16,185,129,0.15)' : badgeTone === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.15)',
            color: badgeTone === 'success' ? '#34D399' : badgeTone === 'warning' ? '#fbbf24' : '#FB7185',
            border: `1px solid ${badgeTone === 'success' ? '#10b981' : badgeTone === 'warning' ? '#f59e0b' : '#f43f5e'}`,
          }}
        >
          {value}
        </span>
      ) : (
        <span
          style={{
            display: 'block',
            marginTop: '0.25rem',
            fontSize: '0.92rem',
            fontWeight: 700,
            color: highlight ? '#34D399' : 'var(--text-main, #F8FAFC)',
            fontFamily: mono ? 'monospace' : 'inherit',
            wordBreak: 'break-all',
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function qualityRatingTone(rating?: string | null): 'success' | 'warning' | 'danger' {
  const r = rating?.toUpperCase();
  if (r === 'RED') return 'danger';
  if (r === 'YELLOW') return 'warning';
  return 'success';
}

function NeonSpinner() {
  return (
    <svg style={{ width: '2rem', height: '2rem', animation: 'spin 1s linear infinite', color: '#25D366' }} fill="none" viewBox="0 0 24 24">
      <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.9 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function WhatsAppDisconnectedIcon() {
  return (
    <div
      style={{
        width: '3.5rem',
        height: '3.5rem',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
      }}
    >
      <svg style={{ width: '1.75rem', height: '1.75rem' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    </div>
  );
}
