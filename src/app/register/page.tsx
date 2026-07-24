'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          adminName,
          email,
          password,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Error al registrar organización');

      // Redirect to onboarding wizard
      router.push(json.data.redirectUrl || '/onboarding');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>📶</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Registra tu ISP en SaaS TOI
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Comienza tu prueba gratuita y automatiza tu cobranza en minutos
          </p>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Nombre de tu Empresa / ISP
            </label>
            <input
              type="text"
              placeholder="Ej: FiberSpeed ISP"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.9rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Tu Nombre Completo (Administrador)
            </label>
            <input
              type="text"
              placeholder="Ej: Roberto Morales"
              required
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.9rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Correo Electrónico de Acceso
            </label>
            <input
              type="email"
              placeholder="admin@fiberspeed.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.9rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Contraseña de Seguridad
            </label>
            <input
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.9rem', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '0.5rem', backgroundColor: '#2563eb', color: '#ffffff', padding: '0.8rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer' }}
          >
            {loading ? 'Instanciando Tenant...' : 'Crear mi Organización 🚀'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: '#64748b' }}>
          ¿Ya tienes una cuenta registrada?{' '}
          <Link href="/subscribers" style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}>
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
