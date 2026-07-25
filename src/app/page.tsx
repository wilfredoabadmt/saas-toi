'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════════
   Landing Page — SaaS TOI ISP · Soft Neumorphic 3D Design
   ═══════════════════════════════════════════════════════════════════════════════ */

const FEATURES = [
  {
    icon: '💬',
    title: 'WhatsApp Cloud API & Inbox',
    desc: 'Envío automatizado de avisos de cobro y recordatorios. Chat Inbox multi-agente con ficha de abonado lateral en tiempo real.',
  },
  {
    icon: '⚡',
    title: 'Auto-Corte MikroTik',
    desc: 'Integración REST nativa con RouterOS 7+. Ejecuta cortes por vencimiento y reactivación instantánea al aprobar comprobante.',
  },
  {
    icon: '🎫',
    title: 'Tickets & Averías',
    desc: 'Generación de tickets autonumerados desde WhatsApp. Asignación a técnicos de campo con notificaciones de estado.',
  },
  {
    icon: '🔒',
    title: 'Seguridad Multi-Tenancy',
    desc: 'Aislamiento absoluto por tenant, almacenamiento cifrado en S3 y credenciales AES-256-GCM en reposo.',
  },
  {
    icon: '👥',
    title: 'Control de Acceso RBAC',
    desc: 'Roles diferenciados para Administradores, Cajeros/Cobranzas y Técnicos de Campo con interfaces especializadas.',
  },
  {
    icon: '📥',
    title: 'Importación Masiva CSV',
    desc: 'Migración ultra-rápida de tu base de clientes existente en minutos mediante archivo CSV estandarizado.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    price: '$49',
    features: ['Hasta 300 abonados', 'WhatsApp Cloud API ilimitado', '1 Router MikroTik integrado', 'Soporte vía tickets'],
    cta: 'Comenzar Prueba',
    featured: false,
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: '$99',
    features: ['Hasta 1,500 abonados', 'WhatsApp Multi-Agente', 'Hasta 5 Routers MikroTik', 'Auto-Corte y Reconexión', 'RBAC (Admins, Cajeros, Técnicos)'],
    cta: 'Comenzar Prueba Pro',
    featured: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: '$199',
    features: ['Abonados ilimitados', 'Routers MikroTik ilimitados', 'Infraestructura Cloud dedicada', 'Soporte técnico prioritario 24/7'],
    cta: 'Contactar Ventas',
    featured: false,
  },
];

const FAQS = [
  {
    q: '¿Cómo funciona el auto-corte en MikroTik?',
    a: 'SaaS TOI se conecta de forma segura a la API REST de RouterOS 7+ mediante puerto HTTPS cifrado con AES-256-GCM. Cuando una cuenta vence, deshabilita automáticamente el secreto PPPoE o regla IP del abonado.',
  },
  {
    q: '¿Requiero aprobación de Meta para usar WhatsApp?',
    a: 'No, la plataforma te guía en el proceso oficial de Meta WhatsApp Cloud API mediante login directo o tus propias credenciales WABA de Meta Developer Console.',
  },
  {
    q: '¿Mis datos están seguros entre organizaciones?',
    a: 'Sí, implementamos arquitectura Multi-Tenant estricta con aislamiento lógico mediante organization_id en todas las consultas y almacenamiento cifrado en Amazon S3.',
  },
  {
    q: '¿Puedo probar la plataforma antes de pagar?',
    a: 'Sí, ofrecemos una prueba gratuita del plan Starter durante 14 días sin necesidad de tarjeta de crédito. Configura tu ISP y prueba todas las funcionalidades.',
  },
];

export default function LandingPage() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  return (
    <div style={{ fontFamily: 'var(--font-sans)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', minHeight: '100vh' }}>
      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <img src="/logotoi.webp" alt="SaaS TOI" className="logo-animated-glow" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>SaaS TOI</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <a href="#features" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>Módulos</a>
            <a href="#pricing" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>Planes</a>
            <a href="#faq" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', textDecoration: 'none' }}>FAQ</a>
            <Link href="/login" className="neu-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section style={{ padding: '5rem 1.5rem 8rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Status Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '9999px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', boxShadow: 'var(--shadow-inset)', marginBottom: '2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            WhatsApp Cloud API + Auto-Corte MikroTik en una sola plataforma
          </div>

          {/* Main Title */}
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.03em', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
            La Plataforma Multi-Tenant de{' '}
            <span style={{ color: 'var(--primary-accent)' }}>Cobranza & Gestión</span>{' '}
            para ISPs y WISPs
          </h1>

          {/* Description */}
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Reduce la morosidad hasta un 40% con recordatorios automáticos por WhatsApp, gestión de comprobantes S3, corte y reconexión instantánea en MikroTik y módulo de tickets para técnicos.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/register" className="neu-btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
              Empieza Gratis Ahora
            </Link>
            <a href="#features" className="neu-btn" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
              Ver Módulos
            </a>
          </div>
        </div>

        {/* Floating Dashboard Mockup */}
        <div style={{ maxWidth: '900px', margin: '4rem auto 0', position: 'relative', zIndex: 1 }}>
          <div className="neu-card" style={{ borderRadius: '24px', padding: '1.5rem', backgroundColor: 'var(--bg-card)', transform: 'perspective(1000px) rotateX(2deg)' }}>
            {/* Mockup Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>SaaS TOI Dashboard</span>
            </div>
            {/* Mockup Content - Mini KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'ABONADOS', value: '1,247', color: 'var(--primary-accent)' },
                { label: 'RECAUDACIÓN', value: '$32.4M', color: '#10b981' },
                { label: 'PENDIENTE', value: '$1.8M', color: '#ef4444' },
                { label: 'COBRANZA', value: '94%', color: '#10b981' },
              ].map((kpi) => (
                <div key={kpi.label} style={{ backgroundColor: 'var(--bg-main)', borderRadius: '14px', padding: '1rem', boxShadow: 'var(--shadow-inset)' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: kpi.color, marginTop: '0.25rem' }}>{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section id="features" style={{ padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Todo lo que tu ISP necesita en un solo lugar
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Diseñado para optimizar las operaciones de proveedores de internet de cualquier tamaño
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="neu-card" style={{ padding: '2rem', textAlign: 'center', borderRadius: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'var(--bg-main)', boxShadow: 'var(--shadow-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1.25rem' }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRICING SECTION ═══ */}
      <section id="pricing" style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Planes Transparentes para tu ISP
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
            Sin contratos forzosos. Cancela o cambia de plan en cualquier momento.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {PLANS.map((plan) => (
              <div
                key={plan.slug}
                className={plan.featured ? 'neu-card' : 'glass-card'}
                style={{
                  padding: '2rem',
                  borderRadius: '24px',
                  position: 'relative',
                  border: plan.featured ? '2px solid var(--primary-accent)' : '1px solid var(--border-color)',
                  boxShadow: plan.featured ? 'var(--shadow-tactile)' : 'var(--shadow-card)',
                  transform: plan.featured ? 'scale(1.03)' : 'none',
                }}
              >
                {plan.featured && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--primary-accent)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 1rem', borderRadius: '9999px', letterSpacing: '0.05em', boxShadow: 'var(--shadow-button)' }}>
                    MÁS POPULAR
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {plan.price}
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}> /mes</span>
                </div>

                <ul style={{ listStyle: 'none', padding: '1.5rem 0', margin: 0, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={plan.featured ? 'neu-btn-primary' : 'neu-btn'}
                  style={{ display: 'block', textAlign: 'center', padding: '0.75rem', fontSize: '0.92rem', marginTop: 'auto' }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ SECTION ═══ */}
      <section id="faq" style={{ padding: '5rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Preguntas Frecuentes
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>
            Resuelve tus dudas sobre la integración y funcionamiento
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FAQS.map((faq) => (
            <div key={faq.q} className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{faq.q}</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ NEWSLETTER / CONTACT ═══ */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          {/* Newsletter */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Mantente Actualizado
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Recibe novedades sobre nuevas funcionalidades, mejoras de la plataforma y tips de gestión para tu ISP.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="email"
                placeholder="tu@email.com"
                className="neu-input"
                style={{ flex: 1, borderRadius: '12px' }}
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button className="neu-btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                Suscribir
              </button>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Contáctanos
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              ¿Tienes dudas o necesitas una demo personalizada? Escríbenos y te respondemos en menos de 24 horas.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Nombre"
                  className="neu-input"
                  style={{ borderRadius: '12px' }}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="neu-input"
                  style={{ borderRadius: '12px' }}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <textarea
                rows={3}
                placeholder="Tu mensaje..."
                className="neu-input"
                style={{ borderRadius: '12px', resize: 'vertical' }}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
              />
              <button className="neu-btn-primary" style={{ padding: '0.75rem', borderRadius: '12px' }}>
                Enviar Mensaje
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            &copy; 2026 SaaS TOI ISP Platform. Todos los derechos reservados.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/privacy" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Privacidad</Link>
            <Link href="/terms" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Términos</Link>
            <Link href="/data-deletion" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Eliminación de Datos</Link>
            <a href="https://toi.bo" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary-accent)', textDecoration: 'none', fontWeight: 600 }}>toi.bo</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
