import React from 'react';
import Link from 'next/link';

export default function DataDeletionInstructionsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui, sans-serif', color: '#0f172a', lineHeight: 1.6 }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Meta Developer Policies & Privacy Compliance
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0.5rem 0' }}>
          Instrucciones para la Eliminación de Datos de Usuario (User Data Deletion)
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Cumplimiento con los estándares de Meta Graph API / WhatsApp Cloud API</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <p style={{ color: '#334155' }}>
            De acuerdo con las políticas para desarrolladores de Meta Platforms, Inc. (Facebook Platform Data Deletion Policy), los usuarios de la integración de WhatsApp Business API tienen derecho a solicitar la eliminación permanente de todos sus datos personales almacenados en nuestros servidores.
          </p>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
            📋 Pasos para solicitar la Eliminación de sus Datos:
          </h2>

          <ol style={{ color: '#334155', paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <strong>Envío de Solicitud por Correo Electrónico:</strong> Envíe un mensaje a <code>data-deletion@saas-toi.com</code> indicando en el asunto: <em>&quot;Solicitud de Eliminación de Datos de Usuario - [Su Número de WhatsApp]&quot;</em>.
            </li>
            <li>
              <strong>Procesamiento en Plataforma:</strong> Nuestro sistema automático o el Oficial de Privacidad verificará la solicitud en un plazo máximo de 48 horas hábiles.
            </li>
            <li>
              <strong>Borrado Definitivo:</strong> Se eliminarán de forma irreversible:
              <ul style={{ marginTop: '0.35rem' }}>
                <li>Registro de abonado (Nombre, teléfono, dirección e email).</li>
                <li>Historial de mensajes e hilos de chat de WhatsApp (<code>message_logs</code>).</li>
                <li>Comprobantes de pago adjuntos en Amazon S3.</li>
                <li>Configuraciones vinculadas a la WABA en Meta Graph API.</li>
              </ul>
            </li>
            <li>
              <strong>Confirmación & Código de Seguimiento:</strong> Recibirá un correo electrónico de confirmación con el código de confirmación del borrado permanente (Confirmation Code / Ticket ID).
            </li>
          </ol>
        </div>

        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Endpoint de Callback para Meta App Review</h2>
          <p style={{ color: '#334155' }}>
            Para verificaciones automáticas de Meta App Review, nuestro endpoint de callback para la eliminación de datos responde en:
            <br />
            <code>POST https://saas-toi-ssd.89.116.29.168.sslip.io/api/data-deletion</code>
          </p>
        </div>
      </section>

      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
        <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Política de Privacidad</Link>
        <Link href="/terms" style={{ color: '#64748b', textDecoration: 'underline' }}>Términos de Servicio</Link>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'underline' }}>Ir al Panel</Link>
      </footer>
    </div>
  );
}
