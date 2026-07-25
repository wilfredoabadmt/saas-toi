'use client';

import React, { useState } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════════
   Landing Page — SaaS TOI ISP · Neumorphic Convex 45° Dark Premium
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
    name: 'Free',
    price: '$0',
    features: ['Hasta 25 abonados', 'WhatsApp Cloud API (100 msgs/mes)', '1 Router MikroTik', 'Soporte comunitario'],
    cta: 'Empezar Gratis',
    featured: false,
  },
  {
    name: 'Starter',
    price: '$49',
    features: ['Hasta 300 abonados', 'WhatsApp Cloud API ilimitado', '1 Router MikroTik integrado', 'Soporte vía tickets'],
    cta: 'Comenzar Prueba',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$99',
    features: ['Hasta 1,500 abonados', 'WhatsApp Multi-Agente', 'Hasta 5 Routers MikroTik', 'Auto-Corte y Reconexión', 'RBAC (Admins, Cajeros, Técnicos)'],
    cta: 'Comenzar Prueba Pro',
    featured: true,
  },
  {
    name: 'Enterprise',
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
    a: 'Sí, ofrecemos un plan Free con hasta 25 abonados y 100 mensajes de WhatsApp mensuales sin costo. Sin tarjeta de crédito, sin límite de tiempo.',
  },
];

export default function LandingPage() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  return (
    <div style={{ fontFamily: 'var(--font-sans)', backgroundColor: '#13151b', color: '#F1F5F9', minHeight: '100vh' }}>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(19, 21, 27, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <img src="/logotoi.webp" alt="SaaS TOI" className="logo-animated-glow" style={{ height: '40px', width: 'auto' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F1F5F9' }}>SaaS TOI</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <a href="#features" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>Módulos</a>
            <a href="#pricing" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>Planes</a>
            <a href="#faq" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8', textDecoration: 'none', transition: 'color 0.2s' }}>FAQ</a>
            <Link href="/login" className="neu-dark-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '23px' }}>
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section style={{ padding: '6rem 1.5rem 10rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background Glow Effects */}
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(ellipse, rgba(0, 102, 255, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', top: '100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(ellipse, rgba(0, 229, 255, 0.06) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Status Badge */}
          <div className="neu-dark-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.82rem', color: '#00E5FF', marginBottom: '2rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00E5FF', display: 'inline-block', boxShadow: '0 0 8px rgba(0, 229, 255, 0.5)' }}></span>
            WhatsApp Cloud API + Auto-Corte MikroTik en una sola plataforma
          </div>

          {/* Main Title */}
          <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.03em', color: '#F1F5F9', marginBottom: '1.5rem' }}>
            La Plataforma Multi-Tenant de{' '}
            <span style={{ background: 'linear-gradient(135deg, #0066FF, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Cobranza & Gestión
            </span>{' '}
            para ISPs y WISPs
          </h1>

          {/* Description */}
          <p style={{ fontSize: '1.1rem', color: '#94A3B8', maxWidth: '640px', margin: '0 auto 2.5rem', lineHeight: 1.65 }}>
            Reduce la morosidad hasta un 40% con recordatorios automáticos por WhatsApp, gestión de comprobantes S3, corte y reconexión instantánea en MikroTik y módulo de tickets para técnicos.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/register" className="neu-dark-btn-primary" style={{ padding: '0.85rem 2.25rem', fontSize: '1rem', borderRadius: '23px' }}>
              Empieza Gratis Ahora
            </Link>
            <a href="#features" className="neu-dark-btn-ghost" style={{ padding: '0.85rem 2.25rem', fontSize: '1rem', borderRadius: '23px' }}>
              Ver Módulos
            </a>
          </div>
        </div>

        {/* Floating Dashboard Mockup */}
        <div style={{ maxWidth: '900px', margin: '4.5rem auto 0', position: 'relative', zIndex: 1 }}>
          <div className="neu-dark-card" style={{ padding: '1.5rem', transform: 'perspective(1000px) rotateX(2deg)' }}>
            {/* Mockup Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00E5FF' }}></div>
              <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>SaaS TOI Dashboard</span>
            </div>
            {/* Mockup Content - Mini KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'ABONADOS', value: '1,247', color: '#0066FF' },
                { label: 'RECAUDACIÓN', value: '$32.4M', color: '#00E5FF' },
                { label: 'PENDIENTE', value: '$1.8M', color: '#fb7185' },
                { label: 'COBRANZA', value: '94%', color: '#00E5FF' },
              ].map((kpi) => (
                <div key={kpi.label} className="neu-dark-input" style={{ borderRadius: '18px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</div>
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
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Todo lo que tu ISP necesita en un solo lugar
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94A3B8', maxWidth: '600px', margin: '0 auto' }}>
            Diseñado para optimizar las operaciones de proveedores de internet de cualquier tamaño
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="neu-dark-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="neu-dark-icon" style={{ width: '64px', height: '64px', fontSize: '1.75rem', margin: '0 auto 1.25rem' }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRICING SECTION ═══ */}
      <section id="pricing" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Planes Transparentes para tu ISP
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94A3B8', marginBottom: '3rem' }}>
            Sin contratos forzosos. Cancela o cambia de plan en cualquier momento.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="neu-dark-card"
                style={{
                  padding: '2rem',
                  position: 'relative',
                  transform: plan.featured ? 'scale(1.03)' : 'none',
                  boxShadow: plan.featured
                    ? '9px -9px 18px #111318, -9px 9px 18px #212530, 0 0 30px rgba(0, 229, 255, 0.12), 0 0 60px rgba(0, 102, 255, 0.08)'
                    : undefined,
                  border: plan.featured ? '1px solid rgba(0, 229, 255, 0.2)' : undefined,
                }}
              >
                {plan.featured && (
                  <div className="neu-dark-badge" style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', color: '#00E5FF', padding: '0.35rem 1rem', boxShadow: '3px -3px 8px #111318, -3px 3px 8px #1f2330, 0 0 12px rgba(0, 229, 255, 0.3)' }}>
                    MÁS POPULAR
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: plan.featured ? '#00E5FF' : '#0066FF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#F1F5F9', marginBottom: '0.25rem' }}>
                  {plan.price}
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#64748B' }}> /mes</span>
                </div>

                <ul style={{ listStyle: 'none', padding: '1.5rem 0', margin: 0, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#CBD5E1' }}>
                      <span style={{ color: '#00E5FF', fontWeight: 700 }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={plan.featured ? 'neu-dark-btn-primary' : 'neu-dark-btn-ghost'}
                  style={{ display: 'block', textAlign: 'center', padding: '0.75rem', fontSize: '0.92rem', marginTop: 'auto', borderRadius: '23px' }}
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
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Preguntas Frecuentes
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94A3B8' }}>
            Resuelve tus dudas sobre la integración y funcionamiento
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FAQS.map((faq) => (
            <div key={faq.q} className="neu-dark-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F1F5F9', marginBottom: '0.5rem' }}>{faq.q}</h3>
              <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ NEWSLETTER / CONTACT ═══ */}
      <section style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          {/* Newsletter */}
          <div className="neu-dark-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '0.5rem' }}>
              Mantente Actualizado
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Recibe novedades sobre nuevas funcionalidades, mejoras de la plataforma y tips de gestión para tu ISP.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="email"
                placeholder="tu@email.com"
                className="neu-dark-input"
                style={{ flex: 1, borderRadius: '23px', padding: '0.75rem 1.25rem' }}
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button className="neu-dark-btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '23px', whiteSpace: 'nowrap' }}>
                Suscribir
              </button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="neu-dark-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F1F5F9', marginBottom: '0.5rem' }}>
              Contáctanos
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              ¿Tienes dudas o necesitas una demo personalizada? Escríbenos y te respondemos en menos de 24 horas.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Nombre"
                  className="neu-dark-input"
                  style={{ borderRadius: '23px', padding: '0.75rem 1.25rem' }}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="neu-dark-input"
                  style={{ borderRadius: '23px', padding: '0.75rem 1.25rem' }}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <textarea
                rows={3}
                placeholder="Tu mensaje..."
                className="neu-dark-input"
                style={{ borderRadius: '23px', padding: '0.75rem 1.25rem', resize: 'vertical' }}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
              />
              <button className="neu-dark-btn-primary" style={{ padding: '0.75rem', borderRadius: '23px' }}>
                Enviar Mensaje
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.03)', padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748B' }}>
            &copy; 2026 SaaS TOI ISP Platform. Todos los derechos reservados.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/privacy" style={{ fontSize: '0.85rem', color: '#64748B', textDecoration: 'none' }}>Privacidad</Link>
            <Link href="/terms" style={{ fontSize: '0.85rem', color: '#64748B', textDecoration: 'none' }}>Términos</Link>
            <Link href="/data-deletion" style={{ fontSize: '0.85rem', color: '#64748B', textDecoration: 'none' }}>Eliminación de Datos</Link>
            <a href="https://toi.bo" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#00E5FF', textDecoration: 'none', fontWeight: 600 }}>toi.bo</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
