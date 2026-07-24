import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui, sans-serif', color: 'var(--text-main)', lineHeight: 1.6 }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          SaaS TOI ISP Platform
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0.5rem 0' }}>
          Política de Privacidad & Tratamiento de Datos
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Última actualización: 24 de Julio de 2026</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>1. Información General</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            SaaS TOI es una plataforma multi-tenant de cobranza automatizada y atención al cliente mediante la API oficial de WhatsApp Cloud API (Meta Platforms, Inc.) diseñada para Proveedores de Servicios de Internet (ISPs). Nos comprometemos a proteger la privacidad y seguridad de la información personal procesada a través de nuestra plataforma.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>2. Datos Recopilados & Uso de WhatsApp Cloud API</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Procesamos únicamente la información indispensable para prestar el servicio de facturación, emisión de avisos de cobro e interacción de soporte:
          </p>
          <ul style={{ color: 'var(--text-muted)', paddingLeft: '1.25rem' }}>
            <li><strong>Información del Abonado:</strong> Nombre, número de teléfono (WhatsApp), correo electrónico, plan de internet contratado y dirección física.</li>
            <li><strong>Interacción por WhatsApp:</strong> Historial de mensajes de soporte, comprobantes de pago enviados por el usuario y notificaciones de estado de servicio.</li>
            <li><strong>Credenciales de Red:</strong> Toda contraseña o token de routers de red (MikroTik) se almacena cifrada estricta en reposo utilizando el algoritmo de grado militar <strong>AES-256-GCM</strong>.</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>3. Protección & Cifrado de Datos</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Implementamos medidas de seguridad de alto nivel: aislamiento estricto por tenant (<code>organization_id</code>), verificación de firma HMAC-SHA256 en webhooks de Meta, cifrado en tránsito HTTPS/TLS 1.3 y almacenamiento de archivos comprobantes en Amazon S3 con URLs firmadas temporales (TTL de 15 minutos).
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>4. Derechos del Usuario & Eliminación de Datos</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Los usuarios pueden solicitar el acceso, rectificación o borrado permanente de sus datos en cualquier momento siguiendo las instrucciones detalladas en nuestra página de <Link href="/data-deletion" style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>Eliminación de Datos</Link>.
          </p>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>5. Contacto</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Para consultas relacionadas con la privacidad de datos, puede escribir a nuestro Oficial de Protección de Datos a <code>privacy@saas-toi.com</code>.
          </p>
        </div>
      </section>

      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Términos de Servicio</Link>
        <Link href="/data-deletion" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Eliminación de Datos</Link>
        <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Ir al Panel</Link>
      </footer>
    </div>
  );
}
