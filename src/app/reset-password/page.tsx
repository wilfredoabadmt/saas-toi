'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('Token de recuperación no proporcionado');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al actualizar contraseña');

      setSuccess(true);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
          Establecer Nueva Contraseña
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Ingresa la nueva contraseña para tu cuenta
        </p>
      </div>

      {success ? (
        <div style={{ backgroundColor: '#064e3b', border: '1px solid #047857', color: '#a7f3d0', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', fontSize: '0.9rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          <strong>¡Contraseña Actualizada!</strong>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales.
          </p>
          <div style={{ marginTop: '1.25rem' }}>
            <Link href="/subscribers" style={{ color: '#34d399', fontWeight: 700, textDecoration: 'none' }}>
              Iniciar Sesión Ahora 🚀
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {errorMsg && (
            <div style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Nueva Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.9rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.9rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            style={{ marginTop: '0.5rem', backgroundColor: '#2563eb', color: '#ffffff', padding: '0.8rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer' }}
          >
            {loading ? 'Guardando...' : 'Guardar Nueva Contraseña 🔐'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <Suspense fallback={<div style={{ color: '#94a3b8' }}>Cargando formulario...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
