'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'nuevo.usuario@isp.com';

  return (
    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
        ¡Invitación de Equipo Aceptada!
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
        Has sido vinculado exitosamente a la casilla <strong>{email}</strong> con los permisos asignados por tu empresa.
      </p>

      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '1rem', borderRadius: '8px', margin: '1.5rem 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
        Tu acceso se encuentra habilitado para operar en el panel del ISP.
      </div>

      <Link href="/subscribers" style={{ display: 'inline-block', backgroundColor: '#16a34a', color: '#ffffff', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 800, textDecoration: 'none' }}>
        Ingresar al Panel 🚀
      </Link>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <Suspense fallback={<div style={{ color: '#94a3b8' }}>Cargando invitación...</div>}>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
