'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════════
   Landing Page — Dark Glassmorphism & Glossy Chrome UI (Locked Dark)
   ═══════════════════════════════════════════════════════════════════════════════ */

function AnimatedHeading({
  text,
  style,
  delay = 200,
  charDelay = 30,
}: {
  text: string;
  style?: React.CSSProperties;
  delay?: number;
  charDelay?: number;
}) {
  const [start, setStart] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStart(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const lines = text.split('\n');

  return (
    <div style={style}>
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {line.split('').map((char, charIndex) => {
            const totalDelay =
              lineIndex * line.length * charDelay + charIndex * charDelay;
            return (
              <span
                key={charIndex}
                style={{
                  display: 'inline-block',
                  transition: 'all 0.5s ease-out',
                  opacity: start ? 1 : 0,
                  transform: start ? 'translateX(0)' : 'translateX(-18px)',
                  transitionDelay: `${totalDelay}ms`,
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FadeIn({
  children,
  delay = 0,
  duration = 800,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

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
    <div style={{ fontFamily: 'var(--font-sans)', backgroundColor: '#060709', color: '#F8FAFC', minHeight: '100vh', overflow: 'hidden' }}>

      {/* Background Spotlight Effects */}
      <div style={{ position: 'fixed', top: '-300px', left: '-200px', width: '900px', height: '900px', background: 'radial-gradient(ellipse, rgba(26, 117, 255, 0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>
      <div style={{ position: 'fixed', top: '-200px', right: '-300px', width: '800px', height: '800px', background: 'radial-gradient(ellipse, rgba(0, 229, 255, 0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }}></div>

      {/* ═══ HERO SECTION (Full-Screen Liquid Glass + Background Video) ═══ */}
      <section style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#000000', color: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

        {/* Background Fullscreen Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.45 }}
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_084718_72a17915-4964-4059-afcd-22d59399b72e.mp4"
            type="video/mp4"
          />
        </video>

        {/* Gradient Overlay for SaaS TOI Theme */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, #060709 100%)', pointerEvents: 'none', zIndex: 1 }} />

        {/* Content Wrapper */}
        <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0 1.5rem' }}>

          {/* Floating Liquid Glass Navbar */}
          <header style={{ width: '100%', maxWidth: '1200px', margin: '1.25rem auto 0', position: 'sticky', top: '1.25rem', zIndex: 50 }}>
            <div className="liquid-glass" style={{ borderRadius: '16px', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Left Logo */}
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: '#FFFFFF' }}>
                <img src="/logotoi.webp" alt="SaaS TOI" className="logo-animated-glow" style={{ height: '36px', width: 'auto', display: 'block' }} />
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>SaaS TOI</span>
              </Link>

              {/* Center Navigation Menu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <a href="#features" style={{ color: '#E2E8F0', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, transition: 'color 0.2s' }}>Módulos</a>
                <a href="#pricing" style={{ color: '#E2E8F0', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, transition: 'color 0.2s' }}>Planes</a>
                <a href="#faq" style={{ color: '#E2E8F0', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, transition: 'color 0.2s' }}>FAQ</a>
                <a href="#empresa" style={{ color: '#E2E8F0', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, transition: 'color 0.2s' }}>Empresa & Redes</a>
                <a href="#contacto" style={{ color: '#E2E8F0', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, transition: 'color 0.2s' }}>Contacto</a>
              </div>

              {/* Right CTA Button */}
              <Link href="/login" className="glossy-pill-btn" style={{ backgroundColor: '#FFFFFF', color: '#000000', padding: '0.55rem 1.35rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s' }}>
                Iniciar Sesión
              </Link>
            </div>
          </header>

          {/* Center Block */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Status Badge */}
              <FadeIn delay={100} duration={800}>
                <div className="liquid-glass" style={{ border: '1px solid rgba(0, 229, 255, 0.3)', color: '#00E5FF', borderRadius: '9999px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00E5FF', boxShadow: '0 0 10px #00E5FF', display: 'inline-block' }}></span>
                  WhatsApp Cloud API + Auto-Corte MikroTik + Agente IA
                </div>
              </FadeIn>

              {/* Animated Heading */}
              <AnimatedHeading
                text={"Gestión Integral para ISP\ncon Inteligencia Artificial."}
                style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.25rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em', color: '#FFFFFF', marginBottom: '1.5rem' }}
                delay={200}
                charDelay={30}
              />

              {/* Subheading */}
              <FadeIn delay={800} duration={1000}>
                <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#CBD5E1', maxWidth: '650px', lineHeight: 1.6, marginBottom: '2.25rem' }}>
                  Automatiza cobranzas por WhatsApp Cloud API, auto-corte en MikroTik, tickets de soporte y atención 24/7 con Agente de IA.
                </p>
              </FadeIn>

              {/* CTA Buttons */}
              <FadeIn delay={1200} duration={1000}>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                  <Link href="/register" className="glossy-blue-btn" style={{ padding: '0.9rem 2.25rem', fontSize: '0.95rem', borderRadius: '12px', textDecoration: 'none' }}>
                    Probar Gratis Ahora
                  </Link>
                  <a href="#features" className="liquid-glass" style={{ border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFFFFF', padding: '0.9rem 2.25rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none', transition: 'all 0.2s' }}>
                    Explorar Módulos
                  </a>
                </div>
              </FadeIn>

            </div>
          </main>

          {/* Bottom Liquid Glass Tagline Pill */}
          <footer style={{ width: '100%', padding: '0 1rem 3.5rem', display: 'flex', justifyContent: 'center' }}>
            <FadeIn delay={1400} duration={1000}>
              <div className="liquid-glass" style={{ border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.75rem 2rem', borderRadius: '16px' }}>
                <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.25rem)', fontWeight: 300, color: '#F1F5F9', margin: 0, textAlign: 'center' }}>
                  WhatsApp Cloud · MikroTik RouterOS · Agente de IA
                </p>
              </div>
            </FadeIn>
          </footer>

        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section id="features" style={{ padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Todo lo que tu ISP necesita en un solo lugar
          </h2>
          <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '600px', margin: '0 auto' }}>
            Diseñado para optimizar las operaciones de proveedores de internet de cualquier tamaño
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card-dark" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(180deg, rgba(26, 117, 255, 0.2) 0%, rgba(26, 117, 255, 0.05) 100%)', border: '1px solid rgba(26, 117, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1.25rem', boxShadow: '0 8px 20px rgba(26, 117, 255, 0.15)' }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRICING SECTION ═══ */}
      <section id="pricing" style={{ padding: '5rem 1.5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Planes Transparentes para tu ISP
          </h2>
          <p style={{ fontSize: '1rem', color: '#94A3B8', marginBottom: '3rem' }}>
            Sin contratos forzosos. Cancela o cambia de plan en cualquier momento.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="glass-card-dark"
                style={{
                  padding: '2rem',
                  position: 'relative',
                  transform: plan.featured ? 'scale(1.03)' : 'none',
                  boxShadow: plan.featured
                    ? '0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.2), 0 0 40px rgba(26, 117, 255, 0.15)'
                    : undefined,
                  border: plan.featured ? '1px solid rgba(26, 117, 255, 0.3)' : undefined,
                }}
              >
                {plan.featured && (
                  <div className="glass-badge glass-badge-info" style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '0.3rem 1rem' }}>
                    MÁS POPULAR
                  </div>
                )}

                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: plan.featured ? '#60A5FA' : '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#F8FAFC', marginBottom: '0.25rem' }}>
                  {plan.price}
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748B' }}> /mes</span>
                </div>

                <ul style={{ listStyle: 'none', padding: '1.5rem 0', margin: 0, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#CBD5E1' }}>
                      <span style={{ color: '#00E5FF', fontWeight: 700 }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={plan.featured ? 'glossy-blue-btn' : 'glossy-pill-btn'}
                  style={{ display: 'block', textAlign: 'center', padding: '0.75rem', fontSize: '0.88rem', marginTop: 'auto' }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ SECTION ═══ */}
      <section id="faq" style={{ padding: '5rem 1.5rem', maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Preguntas Frecuentes
          </h2>
          <p style={{ fontSize: '1rem', color: '#94A3B8' }}>
            Resuelve tus dudas sobre la integración y funcionamiento
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FAQS.map((faq) => (
            <div key={faq.q} className="glass-card-dark" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>{faq.q}</h3>
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ EMPRESA & REDES SOCIALES (toi.bo) ═══ */}
      <section id="empresa" style={{ padding: '5rem 1.5rem 2rem', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="glass-badge glass-badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', fontSize: '0.78rem', marginBottom: '1rem' }}>
              🏢 Datos Corporativos & Redes Oficiales
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.75rem' }}>
              Telecomunicaciones Oportunas Inteligentes S.R.L.
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto' }}>
              Proveedores de servicios de Internet de alta velocidad para familias y empresas. Conoce nuestra información oficial y canales directos de atención.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {/* Card 1: Información Legal & NIT */}
            <div className="glass-card-dark" style={{ padding: '1.75rem', borderRadius: '20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏛️</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>Razón Social & NIT</h3>
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1rem' }}>
                <strong style={{ color: '#F8FAFC' }}>TELECOMUNICACIONES OPORTUNAS INTELIGENTES S.R.L.</strong>
              </p>
              <div className="glass-input-dark" style={{ padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.82rem', color: '#38BDF8', fontWeight: 700 }}>
                NIT: 305020028
              </div>
            </div>

            {/* Card 2: Ubicación & Oficina */}
            <div className="glass-card-dark" style={{ padding: '1.75rem', borderRadius: '20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📍</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>Oficina Principal</h3>
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1rem' }}>
                Av. Juan Pablo II Nº 30, Edificio San Juan de Dios, Piso 2, Oficina 22 (Zona Villa Tunari).<br />
                <strong style={{ color: '#F8FAFC' }}>El Alto, Bolivia</strong>
              </p>
              <div className="glass-input-dark" style={{ padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.82rem', color: '#34D399', fontWeight: 700 }}>
                📞 Teléfono: +591 69926886
              </div>
            </div>

            {/* Card 3: Redes Sociales Oficiales */}
            <div className="glass-card-dark" style={{ padding: '1.75rem', borderRadius: '20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🌐</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>Redes Sociales Oficiales</h3>
              <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1rem' }}>
                Conéctate con nosotros en nuestras plataformas para promociones y soporte al cliente:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a
                  href="https://www.facebook.com/toielaltointernet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-input-dark"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.82rem', color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  Facebook (@toielaltointernet)
                </a>
                <a
                  href="https://www.tiktok.com/@toi.internet?_t=ZM-8sjbOZErT9B&_r=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-input-dark"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.82rem', color: '#F472B6', textDecoration: 'none', fontWeight: 600 }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.3 2.56.02.97.55 1.89 1.39 2.37.9.52 2.06.52 2.94-.01.88-.53 1.38-1.53 1.39-2.55.03-3.64.01-7.29.02-10.93z" /></svg>
                  TikTok (@toi.internet)
                </a>
                <a
                  href="https://wa.me/59169926886"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-input-dark"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderRadius: '12px', fontSize: '0.82rem', color: '#4ADE80', textDecoration: 'none', fontWeight: 600 }}
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" /></svg>
                  WhatsApp directo (+591 69926886)
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ NEWSLETTER / CONTACT ═══ */}
      <section id="contacto" style={{ padding: '3rem 1.5rem 5rem', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          {/* Newsletter */}
          <div className="glass-card-dark" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>
              Mantente Actualizado
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Recibe novedades sobre nuevas funcionalidades, mejoras de la plataforma y tips de gestión para tu ISP.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="email"
                placeholder="tu@email.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="glass-input-dark"
                style={{ flex: 1, padding: '0.75rem 1rem' }}
              />
              <button className="glossy-blue-btn" style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}>
                Suscribir
              </button>
            </div>
          </div>

          {/* Contact */}
          <div className="glass-card-dark" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>
              Contacto Directo
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              ¿Tienes dudas específicas? Nuestro equipo técnico responde en menos de 24 horas.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Tu nombre"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="glass-input-dark"
                style={{ padding: '0.75rem 1rem' }}
              />
              <input
                type="email"
                placeholder="tu@email.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="glass-input-dark"
                style={{ padding: '0.75rem 1rem' }}
              />
              <textarea
                placeholder="Tu mensaje..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="glass-input-dark"
                style={{ padding: '0.75rem 1rem', minHeight: '80px', resize: 'vertical' }}
              />
              <button className="glossy-blue-btn" style={{ padding: '0.75rem 1.5rem', width: '100%', justifyContent: 'center' }}>
                Enviar Mensaje
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: '4rem 1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 1, backgroundColor: '#040507' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>

            {/* Col 1: Brand & Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img src="/logotoi.webp" alt="SaaS TOI" style={{ height: '32px', width: 'auto' }} />
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC' }}>SaaS TOI</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '1rem' }}>
                Desarrollado para TELECOMUNICACIONES OPORTUNAS INTELIGENTES S.R.L. Plataforma integral de gestión ISP, automatización por WhatsApp Cloud API e integración MikroTik.
              </p>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                NIT: 305020028
              </div>
            </div>

            {/* Col 2: Enlaces Rápidos */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navegación</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li><a href="#features" style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>Módulos & Funcionalidades</a></li>
                <li><a href="#pricing" style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>Planes & Precios</a></li>
                <li><a href="#faq" style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>Preguntas Frecuentes</a></li>
                <li><a href="#empresa" style={{ fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}>Datos Corporativos</a></li>
                <li><Link href="/login" style={{ fontSize: '0.85rem', color: '#1A75FF', textDecoration: 'none', fontWeight: 700 }}>Iniciar Sesión</Link></li>
              </ul>
            </div>

            {/* Col 3: Ubicación & Contacto */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contacto & Ubicación</h4>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                📍 Av. Juan Pablo II Nº 30, Edif. San Juan de Dios, Piso 2, Of. 22 (Zona Villa Tunari)
              </p>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
                📍 El Alto, Bolivia
              </p>
              <p style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: 600 }}>
                📞 Teléfono: +591 69926886
              </p>
            </div>

            {/* Col 4: Redes Sociales */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Redes Sociales</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a
                  href="https://www.facebook.com/toielaltointernet"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}
                >
                  <span style={{ color: '#60A5FA' }}>🔵</span> Facebook Oficial
                </a>
                <a
                  href="https://www.tiktok.com/@toi.internet?_t=ZM-8sjbOZErT9B&_r=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}
                >
                  <span style={{ color: '#F472B6' }}>🎵</span> TikTok Official
                </a>
                <a
                  href="https://wa.me/59169926886"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}
                >
                  <span style={{ color: '#4ADE80' }}>💬</span> WhatsApp Soporte
                </a>
                <a
                  href="https://toi.bo"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94A3B8', textDecoration: 'none' }}
                >
                  <span style={{ color: '#00E5FF' }}>🌐</span> Web Oficial (toi.bo)
                </a>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
              © 2026 TELECOMUNICACIONES OPORTUNAS INTELIGENTES S.R.L. Todos los derechos reservados.
            </span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Link href="/terms" style={{ fontSize: '0.82rem', color: '#94A3B8', textDecoration: 'none' }}>Términos</Link>
              <Link href="/privacy" style={{ fontSize: '0.82rem', color: '#94A3B8', textDecoration: 'none' }}>Privacidad</Link>
              <a href="https://toi.bo" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: '#94A3B8', textDecoration: 'none' }}>toi.bo</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
