'use client';

import React, { useState } from 'react';

interface WabaConnectButtonProps {
  onSuccess?: () => void;
}

export function WabaConnectButton({ onSuccess }: WabaConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnect = () => {
    setIsLoading(true);
    setErrorMsg(null);

    const mockCode = 'mock_meta_embedded_signup_code_' + Date.now();

    fetch('/api/waba/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: mockCode }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          throw new Error(json.message || 'Error al conectar WhatsApp');
        }
        if (onSuccess) onSuccess();
        window.location.reload();
      })
      .catch((err) => {
        setErrorMsg(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={isLoading}
        style={{
          backgroundColor: '#16a34a',
          color: '#ffffff',
          border: 'none',
          padding: '0.8rem 1.5rem',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.92rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
          transition: 'all 0.2s ease',
        }}
      >
        <span>💬</span> {isLoading ? 'Estableciendo Conexión Segura Meta...' : 'Conectar Cuenta WABA (Embedded Signup)'}
      </button>

      {errorMsg && (
        <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.75rem', fontWeight: 500 }}>⚠️ {errorMsg}</p>
      )}
    </div>
  );
}
