import React from 'react';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui, sans-serif', color: 'var(--text-main)', lineHeight: 1.6 }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          SaaS TOI ISP Platform
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0.5rem 0' }}>
          Términos y Condiciones de Servicio
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Última actualización: 24 de Julio de 2026</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>1. Aceptación de los Términos</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Al acceder o utilizar la plataforma SaaS TOI ISP, el Administrador y los usuarios autorizados del ISP aceptan quedar vinculados por los presentes Términos y Condiciones.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>2. Uso Autorizado & WhatsApp Cloud API</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            La plataforma facilita el envío de recordatorios de cobranza de categoría Utility aprobados por Meta, el soporte técnico a abonados y la gestión de routers de red. El ISP es responsable de contar con el consentimiento de sus abonados para recibir notificaciones por WhatsApp.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>3. Multi-Tenancy & Seguridad de Datos</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Garantizamos el aislamiento lógico de los datos de cada ISP a través de <code>organization_id</code> y el cifrado de credenciales de infraestructura (MikroTik) con AES-256-GCM.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>4. Limitación de Responsabilidad</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            SaaS TOI no se responsabiliza por interrupciones de servicio originadas por caídas globales de la red de Meta, la API de WhatsApp Cloud o fallas físicas en los enlaces de los proveedores de internet.
          </p>
        </div>
      </section>

      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Política de Privacidad</Link>
        <Link href="/data-deletion" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Eliminación de Datos</Link>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Ir al Panel</Link>
      </footer>
    </div>
  );
}
