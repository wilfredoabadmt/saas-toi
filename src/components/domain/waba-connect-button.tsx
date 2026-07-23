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

    // Mock/Simulated Embedded Signup flow if FB SDK is not available
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
          padding: '0.75rem 1.25rem',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        💬 {isLoading ? 'Conectando con Meta...' : 'Conectar WhatsApp Business (Embedded Signup)'}
      </button>

      {errorMsg && (
        <p style={{ color: '#991b1b', fontSize: '0.85rem', marginTop: '0.5rem' }}>{errorMsg}</p>
      )}
    </div>
  );
}
