import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', lineHeight: 1.6 }}>
      {/* Top Navbar */}
      <nav style={{ borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/logotoi.webp"
              alt="SaaS TOI Logo"
              className="logo-animated-glow"
              style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Características</a>
            <a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Precios</a>
            <a href="#faq" style={{ color: '#94a3b8', textDecoration: 'none' }}>FAQ</a>
            <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.82rem' }}>Privacidad</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/subscribers" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
              Iniciar Sesión
            </Link>
            <Link href="/register" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', transition: 'all 0.2s' }}>
              Prueba Gratuita 🚀
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 1.5rem 4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1e293b', border: '1px solid #334155', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8', marginBottom: '1.5rem' }}>
          <span>✨</span> WhatsApp Cloud API + Auto-Corte MikroTik en una sola plataforma
        </div>

        <h1 style={{ fontSize: '3.25rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.15, margin: '0 auto 1.25rem auto', maxWidth: '900px' }}>
          La Plataforma Multi-Tenant de Cobranza & Gestión para <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ISPs y WISPs</span>
        </h1>

        <p style={{ fontSize: '1.15rem', color: '#94a3b8', maxWidth: '750px', margin: '0 auto 2.5rem auto' }}>
          Reduce la morosidad hasta un 40% con recordatorios automáticos por WhatsApp, gestión de comprobantes S3, corte y reconexión inmediata en MikroTik y módulo de tickets para técnicos.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem' }}>
          <Link href="/register" style={{ backgroundColor: '#2563eb', color: '#ffffff', padding: '0.85rem 2rem', borderRadius: '10px', fontWeight: 800, fontSize: '1.05rem', textDecoration: 'none', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)' }}>
            Registrar mi ISP Gratis
          </Link>
          <a href="#features" style={{ backgroundColor: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '0.85rem 2rem', borderRadius: '10px', fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none' }}>
            Ver Demostración
          </a>
        </div>
      </section>

      {/* Stats KPI Bar */}
      <section style={{ borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8' }}>-40%</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TASA DE MOROSIDAD</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#818cf8' }}>100%</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>RECONEXIÓN AUTOMÁTICA</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399' }}>AES-256</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>CIFRADO MIKROTIK</div>
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f43f5e' }}>24/7</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>INBOX MULTI-AGENTE</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.75rem 0' }}>Todo lo que tu ISP necesita en un solo lugar</h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Diseñado para optimizar las operaciones de proveedores de internet de cualquier tamaño</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#38bdf8' }}>WhatsApp Cloud API & Inbox</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
              Envío automatizado de avisos de cobro y recordatorios. Chat Inbox multi-agente en 3 columnas con ficha de abonado lateral.
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#818cf8' }}>Auto-Corte & Reconexión MikroTik</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
              Integración REST nativa con RouterOS 7+. Ejecuta cortes por vencimiento y reactivación inmediata al aprobar comprobante de pago.
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎫</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f59e0b' }}>Tickets & Averías de Campo</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
              Generación de tickets autonumerados desde el chat de WhatsApp. Asignación a técnicos de campo con notificaciones de cambio de estado.
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#34d399' }}>Seguridad & Multi-Tenancy</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
              Aislamiento absoluto por tenant (`organization_id`), almacenamiento de comprobantes en S3 y cifrado AES-256-GCM de credenciales de red.
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ec4899' }}>Control de Acceso RBAC</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
              Roles diferenciados para Administradores, Cajeros/Cobranzas y Técnicos de Campo con restricción de menú e interfaces especializadas.
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#38bdf8' }}>Importación Masiva CSV</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
              Migración ultra-rápida de tu base de clientes existente en minutos mediante archivo CSV estandarizado.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ borderTop: '1px solid #1e293b', backgroundColor: '#0b1120', padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.75rem 0' }}>Planes Transparentes para tu ISP</h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Sin contratos forzosos. Cancela o cambia de plan en cualquier momento.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Start Plan */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>START</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', margin: '0.75rem 0' }}>$49 <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>/mes</span></div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>Ideal para pequeños WISPs y proveedores emergentes.</p>
              <ul style={{ color: '#cbd5e1', fontSize: '0.9rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
                <li>Hasta 300 abonados</li>
                <li>WhatsApp Cloud API ilimitado</li>
                <li>1 Router MikroTik integrado</li>
                <li>Soporte vía tickets</li>
              </ul>
              <Link href="/register" style={{ marginTop: 'auto', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', border: '1px solid #334155' }}>
                Comenzar Prueba
              </Link>
            </div>

            {/* Pro Plan (Featured) */}
            <div style={{ backgroundColor: '#0f172a', border: '2px solid #2563eb', borderRadius: '16px', padding: '2.25rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-14px', right: '20px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 10px', borderRadius: '10px' }}>MÁS POPULAR</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>PRO</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', margin: '0.75rem 0' }}>$99 <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>/mes</span></div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>Para ISPs en rápido crecimiento que requieren automatización total.</p>
              <ul style={{ color: '#cbd5e1', fontSize: '0.9rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
                <li>Hasta 1,500 abonados</li>
                <li>WhatsApp Cloud API Multi-Agente</li>
                <li>Hasta 5 Routers MikroTik</li>
                <li>Auto-Corte y Reconexión Instantánea</li>
                <li>RBAC (Admins, Cajeros y Técnicos)</li>
              </ul>
              <Link href="/register" style={{ marginTop: 'auto', backgroundColor: '#2563eb', color: '#ffffff', textAlign: 'center', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
                Comenzar Prueba Pro 🚀
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '2.25rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818cf8' }}>ENTERPRISE</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', margin: '0.75rem 0' }}>$199 <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>/mes</span></div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>Para redes masivas con soporte dedicado.</p>
              <ul style={{ color: '#cbd5e1', fontSize: '0.9rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
                <li>Abonados ilimitados</li>
                <li>Routers MikroTik ilimitados</li>
                <li>Infraestructura Cloud dedicada</li>
                <li>Soporte técnico prioritario 24/7</li>
              </ul>
              <Link href="/register" style={{ marginTop: 'auto', backgroundColor: '#1e293b', color: '#ffffff', textAlign: 'center', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', border: '1px solid #334155' }}>
                Contactar Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Preguntas Frecuentes</h2>
          <p style={{ color: '#94a3b8' }}>Resuelve tus dudas sobre la integración y funcionamiento</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.5rem 0' }}>¿Cómo funciona el auto-corte en MikroTik?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              SaaS TOI se conecta de forma segura a la API REST de RouterOS 7+ mediante puerto HTTPS cifrado con AES-256-GCM. Cuando una cuenta vence, deshabilita automáticamente el secreto PPPoE o regla IP del abonado.
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.5rem 0' }}>¿Requiero aprobación de Meta para usar WhatsApp?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              No, la plataforma te guía en el proceso oficial de Meta WhatsApp Cloud API mediante login directo o tus propias credenciales WABA de Meta Developer Console.
            </p>
          </div>

          <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', margin: '0 0 0.5rem 0' }}>¿Mis datos están seguros entre organizaciones?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              Sí, implementamos arquitectura Multi-Tenant estricta con aislamiento lógico mediante `organization_id` en todas las consultas y almacenamiento cifrado en Amazon S3.
            </p>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer style={{ borderTop: '1px solid #1e293b', backgroundColor: '#050811', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', fontSize: '0.88rem', color: '#64748b' }}>
          <div>
            © 2026 SaaS TOI ISP Platform. Todos los derechos reservados.
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Política de Privacidad</Link>
            <Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Términos de Servicio</Link>
            <Link href="/data-deletion" style={{ color: '#94a3b8', textDecoration: 'none' }}>Eliminación de Datos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
