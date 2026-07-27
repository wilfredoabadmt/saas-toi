'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error?.message || 'Credenciales incorrectas');
      }

      // Redirect user to destination based on role
      router.push(json.redirectUrl || '/subscribers');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill demo credentials helper
  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
        backgroundImage: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(99, 102, 241, 0.15), rgba(255, 255, 255, 0))',
        padding: '1rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', boxSizing: 'border-box' }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#ffffff',
                fontSize: '1.25rem',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              ST
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#ffffff' }}>
              SaaS TOI <span style={{ color: '#a855f7' }}>ISP</span>
            </span>
          </Link>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f4f4f5', margin: '1rem 0 0.25rem 0', letterSpacing: '-0.02em' }}>
            Iniciar Sesión
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: 0 }}>
            Ingresa a tu panel de gestión de ISP o Administración SaaS
          </p>
        </div>

        {/* Login Glassmorphic Card */}
        <div
          style={{
            backgroundColor: 'rgba(24, 24, 27, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '1.25rem 1.25rem 1.5rem 1.25rem',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {errorMsg && (
            <div
              style={{
                backgroundColor: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                color: '#fb7185',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '0.5rem' }}>
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tu-isp.com"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#d4d4d8' }}>
                  Contraseña
                </label>
                <Link
                  href="/forgot-password"
                  style={{ fontSize: '0.8rem', color: '#a855f7', textDecoration: 'none', fontWeight: 600 }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    padding: '0.75rem 2.75rem 0.75rem 1rem',
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#a1a1aa',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    minHeight: '44px',
                    minWidth: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '0.85rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? 'Autenticando...' : 'Iniciar Sesión 🚀'}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #27272a',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '0.65rem', letterSpacing: '0.05em' }}>
              ⚡ Credenciales de Demostración Rápida:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => fillDemo('superadmin@saas-toi.com', 'SuperAdmin123!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  borderRadius: '8px',
                  color: '#e9d5ff',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>🗣️ Super Admin SaaS</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>superadmin@saas-toi.com</div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c084fc', flexShrink: 0 }}>Usar →</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('admin@ispdemo.com', 'AdminISP123!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  color: '#c7d2fe',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  minHeight: '48px',
                }}
              >
                <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>🏢 Admin ISP Demo</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>admin@ispdemo.com</div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#818cf8', flexShrink: 0 }}>Usar →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Registration Callout */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#a1a1aa' }}>
          ¿No tienes una empresa ISP registrada?{' '}
          <Link href="/register" style={{ color: '#a855f7', fontWeight: 700, textDecoration: 'none' }}>
            Registra tu ISP gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
