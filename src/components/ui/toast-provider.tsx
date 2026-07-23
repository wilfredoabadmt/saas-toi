'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  addToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const getToastStyle = (type: Toast['type']): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '0.85rem 1.25rem',
      borderRadius: '12px',
      fontSize: '0.88rem',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      boxShadow: '0 8px 24px -4px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(8px)',
      animation: 'toast-in 0.35s ease-out',
      cursor: 'pointer',
      maxWidth: '420px',
      lineHeight: 1.4,
    };

    switch (type) {
      case 'success':
        return { ...base, backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' };
      case 'error':
        return { ...base, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case 'warning':
        return { ...base, backgroundColor: '#fef9c3', color: '#92400e', border: '1px solid #fde047' };
      default:
        return { ...base, backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' };
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '0.5rem',
            zIndex: 9999,
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={getToastStyle(toast.type)}
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              <span>{getIcon(toast.type)}</span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
