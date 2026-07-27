'use client';

/**
 * src/components/waba/MetaChannelsPanel.tsx
 * ---------------------------------------------------------------------------
 * Componente Client Component para conectar Canales Sociales de Meta:
 * Facebook Messenger & Instagram Direct.
 *
 * Muestra:
 *   · Tarjeta Glassmorphic `.glass-card-dark` con botón `.btn-meta-glossy`
 *   · Estado de conexión y listado de Páginas / cuentas de Instagram vinculadas
 */

import React, { useState } from 'react';

interface MetaPageChannel {
  id: string;
  pageName: string;
  instagramUsername?: string;
  connectedAt: string;
}

export function MetaChannelsPanel() {
  const [channels, setChannels] = useState<MetaPageChannel[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectMeta = () => {
    setIsConnecting(true);
    // Simular o invocar FB.login con permisos de pages_messaging / instagram_manage_messages
    if (typeof window !== 'undefined' && window.FB) {
      window.FB.login(
        (response) => {
          setIsConnecting(false);
          if (response.authResponse) {
            // Ejemplo: actualizar páginas vinculadas
            setChannels([
              {
                id: 'page_123',
                pageName: 'ISP Telecom - Oficial',
                instagramUsername: '@isp.telecom.oficial',
                connectedAt: new Date().toLocaleDateString('es-BO'),
              },
            ]);
          }
        },
        { scope: 'pages_show_list,pages_messaging,instagram_basic,instagram_manage_messages' }
      );
    } else {
      setTimeout(() => {
        setIsConnecting(false);
        setChannels([
          {
            id: 'page_101',
            pageName: 'Mi Empresa ISP - Fanpage',
            instagramUsername: '@mi_empresa_isp',
            connectedAt: new Date().toLocaleDateString('es-BO'),
          },
        ]);
      }, 1000);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main, #F8FAFC)', margin: 0 }}>
            Facebook Messenger & Instagram Direct
          </h2>
          <p style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
            Atiende consultas y mensajes de tus fanpages de Facebook y perfiles comerciales de Instagram desde el Chat Inbox centralizado.
          </p>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            border: `1px solid ${channels.length > 0 ? 'var(--status-success-bg, rgba(16,185,129,0.3))' : 'var(--border-color)'}`,
            backgroundColor: channels.length > 0 ? 'var(--status-success-bg, rgba(16,185,129,0.15))' : 'rgba(255,255,255,0.05)',
            color: channels.length > 0 ? 'var(--status-success-text, #34D399)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {channels.length > 0 ? `${channels.length} Canal(es) Activo(s)` : 'Sin conectar'}
        </span>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {channels.length === 0 ? (
          <div>
            <button
              type="button"
              onClick={handleConnectMeta}
              disabled={isConnecting}
              className="btn-meta-glossy"
            >
              <MetaIcon />
              {isConnecting ? 'Abriendo Meta...' : 'Conectar Páginas de Facebook e Instagram'}
            </button>

            <ul style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <li>· Requiere ser administrador de la Página de Facebook y cuenta comercial de Instagram.</li>
              <li>· La vinculación es 1-Click mediante inicio de sesión de Meta.</li>
            </ul>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-xl, 14px)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MetaIcon />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      {ch.pageName}
                    </span>
                  </div>
                  {ch.instagramUsername && (
                    <span style={{ fontSize: '0.8rem', color: '#e1306c', fontWeight: 600 }}>
                      📸 Instagram: {ch.instagramUsername}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Conectado el: {ch.connectedAt}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleConnectMeta}
              disabled={isConnecting}
              style={{
                alignSelf: 'flex-start',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'rgba(255,255,255,0.06)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Conectar otra Página
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function MetaIcon() {
  return (
    <svg style={{ width: '1.2rem', height: '1.2rem', flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
