'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-canvas dark:bg-dark min-h-screen transition-colors duration-300">
      {/* Top Navbar */}
      <nav className="bg-sidebar dark:border border-subtle shadow-card rounded-2xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start gap-4 p-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logotoi.webp" alt="SaaS TOI Logo" className="h-10 w-auto logo-animated-glow" />
          </Link>

          <div className="flex flex-wrap gap-2 justify-end">
            <Link href="#features" className="text-sm font-medium text-muted dark:text-muted hover:underline">Features</Link>
            <Link href="#pricing" className="text-sm font-medium text-muted dark:text-muted hover:underline">Pricing</Link>
            <Link href="#faq" className="text-sm font-medium text-muted dark:text-muted hover:underline">FAQ</Link>
            <Link href="/privacy" className="text-sm font-medium text-muted dark:text-muted">Privacy</Link>

            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-primary dark:bg-primary hover:bg-primary-dark text-white hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8 py-20 px-4">
          {/* Status Badge */}
          <div className="neu-pressed bg-emerald-50/40 dark:bg-emerald-500/30 rounded-full px-3 py-1 text-xs font-medium text-emerald-800 dark:text-white shadow-sm mb-6">
            ✨ WhatsApp Cloud API + Auto-Corte MikroTik en una sola plataforma
          </div>

          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-primary dark:text-white text-center">
            La Plataforma Multi‑Tenant de Cobranza & Gestión para{' '}
            <span className="bg-gradient-to-r from-primary to-primary dark:from-primary-800 text-transparent bg-clip-text">
              ISPs y WISPs
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg text-muted dark:text-muted max-w-xl text-center mb-8">
            Reduce la morosidad hasta un 40 % con recordatorios automáticos por WhatsApp, gestión de comprobantes S3, corte y reconexión instantánea en MikroTik y módulo de tickets para técnicos.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register" className="neu-button-primary w-full text-white text-center px-8 py-3 rounded-xl font-semibold hover:bg-primary-hover transition-colors">
              Empieza Gratis Ahora
            </Link>
            <Link href="#features" className="neu-flat border border-subtle bg-transparent text-primary dark:text-primary px-8 py-3 rounded-xl font-semibold hover:bg-canvas hover:shadow-sm transition-colors">
              Ver Demo Interactiva
            </Link>
          </div>
        </div>

        {/* Mockup Window */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img src="/mockup-hero.png" alt="App Mockup" className="neu-flat w-2/3 max-w-2xl rounded-3xl shadow-neu-flat animate-pulse" />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <h2 className="text-3xl font-bold text-center text-primary dark:text-white mb-6">
          Todo lo que tu ISP necesita en un solo lugar
        </h2>
        <p className="text-lg text-muted text-center max-w-2xl mx-auto mb-12">
          Diseñado para optimizar las operaciones de proveedores de internet de cualquier tamaño
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature Card 1 */}
          <div className="neu-flat bg-card dark:bg-card rounded-3xl p-8 text-center shadow-sm hover:shadow-neu-flat transition-shadow">
            <div className="text-3xl mb-4">{/* Icon 1 */}</div>
            <h3 className="text-xl font-semibold text-primary dark:text-primary mb-2">WhatsApp Cloud API & Inbox</h3>
            <p className="text-base text-muted dark:text-muted">
              Envío automatizado de avisos de cobro y recordatorios. Chat Inbox multi‑agente en 3 columnas con ficha de abonado lateral.
            </p>
          </div>

          {/* Feature Card 2 */}
          <div className="neu-flat bg-card dark:bg-card rounded-3xl p-8 text-center shadow-sm hover:shadow-neu-flat transition-shadow">
            <div className="text-3xl mb-4">{/* Icon 2 */}</div>
            <h3 className="text-xl font-semibold text-primary dark:text-primary mb-2">Auto‑Corte MikroTik</h3>
            <p className="text-base text-muted dark:text-muted">
              Integración REST nativa con RouterOS 7+. Ejecuta cortes por vencimiento y reactivación instantánea al aprobar comprobante de pago.
            </p>
          </div>

          {/* Feature Card 3 */}
          <div className="neu-flat bg-card dark:bg-card rounded-3xl p-8 text-center shadow-sm hover:shadow-neu-flat transition-shadow">
            <div className="text-3xl mb-4">{/* Icon 3 */}</div>
            <h3 className="text-xl font-semibold text-primary dark:text-primary mb-2">Tickets & Averías</h3>
            <p className="text-base text-muted dark:text-muted">
              Generación de tickets autonumerados desde el chat de WhatsApp. Asignación a técnicos de campo con notificaciones de cambio de estado.
            </p>
          </div>

          {/* Feature Card 4 */}
          <div className="neu-flat bg-card dark:bg-card rounded-3xl p-8 text-center shadow-sm hover:shadow-neu-flat transition-shadow">
            <div className="text-3xl mb-4">{/* Icon 4 */}</div>
            <h3 className="text-xl font-semibold text-primary dark:text-primary mb-2">Seguridad Multi‑Tenancy</h3>
            <p className="text-base text-muted dark:text-muted">
              Aislamiento absoluto por tenant (`organization_id`), almacenamiento cifrado en Amazon S3 y cifrado AES‑256‑GCM de credenciales.
            </p>
          </div>

          {/* Feature Card 5 */}
          <div className="neu-flat bg-card dark:bg-card rounded-3xl p-8 text-center shadow-sm hover:shadow-neu-flat transition-shadow">
            <div className="text-3xl mb-4">{/* Icon 5 */}</div>
            <h3 className="text-xl font-semibold text-primary dark:text-primary mb-2">Control de Acceso RBAC</h3>
            <p className="text-base text-muted dark:text-muted">
              Roles diferenciados para Administradores, Cajeros/Cobranzas y Técnicos de Campo con restricción de menú e interfaces especializadas.
            </p>
          </div>

          {/* Feature Card 6 */}
          <div className="neu-flat bg-card dark:bg-card rounded-3xl p-8 text-center shadow-sm hover:shadow-neu-flat transition-shadow">
            <div className="text-3xl mb-4">{/* Icon 6 */}</div>
            <h3 className="text-xl font-semibold text-primary dark:text-primary mb-2">Importación Masiva CSV</h3>
            <p className="text-base text-muted dark:text-muted">
              Migración ultra‑rápida de tu base de clientes existente en minutos mediante archivo CSV estandarizado.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-card dark:bg-card py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-primary dark:text-white mb-6">
            Plantas Transparentes para tu ISP
          </h2>
          <p className="text-lg text-muted dark:text-muted mb-12">
            Sin contratos forzosos. Cancela o cambia de plan en cualquier momento.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="neu-flat bg-card dark:bg-card rounded-3xl p-6 border border-subtle flex flex-col h-full">
              <div className="flex flex-col items-center">
                <div className="text-xl font-medium text-primary dark:text-primary mb-1">START</div>
                <div className="text-3xl font-bold text-white mb-2">$49 <span className="text-muted dark:text-muted">/mes</span></div>
                <ul className="mt-4 w-full justify-center text-left space-y-2 font-medium text-muted">
                  <li>Hasta 300 abonados</li>
                  <li>WhatsApp Cloud API ilimitado</li>
                  <li>1 Router MikroTik integrado</li>
                  <li>Soporte vía tickets</li>
                </ul>
                <Link href="/register" className="mt-auto w-full neu-button-primary bg-primary dark:bg-primary-dark text-white font-semibold py-2 rounded-lg hover:bg-primary-hover transition-colors">
                  Comenzar Prueba
                </Link>
              </div>
            </div>

            {/* Pro (Featured) */}
            <div className="neu-flat bg-card dark:bg-card rounded-3xl p-6 border-2 border-primary dark:border-primary/50 flex flex-col h-full position-relative">
              <div className="absolute -top-4 right-4 bg-primary dark:bg-primary dark:text-white text-xs font-medium px-3 py-1 rounded">
                MÁS POPULAR
              </div>
              <div className="flex flex-col items-center">
                <div className="text-xl font-medium text-primary dark:text-primary mb-1">PRO</div>
                <div className="text-3xl font-bold text-white mb-2">$99 <span className="text-muted dark:text-muted">/mes</span></div>
                <ul className="mt-4 w-full justify-center text-left space-y-2 font-medium text-muted">
                  <li>Hasta 1 500 abonados</li>
                  <li>WhatsApp Cloud API Multi‑Agente</li>
                  <li>Hasta 5 Routers MikroTik</li>
                  <li>Auto‑Corte y Reconexión Instantánea</li>
                  <li>RBAC (Admins, Cajeros, Técnicos)</li>
                </ul>
                <Link href="/register" className="mt-auto w-full neu-button-primary bg-primary-dark text-white font-semibold py-2 rounded-lg hover:bg-primary hover:shadow-lg transition-colors">
                  Comenzar Prueba Pro 🚀
                </Link>
              </div>
            </div>

            {/* Enterprise */}
            <div className="neu-flat bg-card dark:bg-card rounded-3xl p-6 border border-subtle flex flex-col h-full">
              <div className="flex flex-col items-center">
                <div className="text-xl font-medium text-primary dark:text-primary mb-1">ENTERPRISE</div>
                <div className="text-3xl font-bold text-white mb-2">$199 <span className="text-muted dark:text-muted">/mes</span></div>
                <ul className="mt-4 w-full justify-center text-left space-y-2 font-medium text-muted">
                  <li>Abonados ilimitados</li>
                  <li>Routers MikroTik ilimitados</li>
                  <li>Infraestructura Cloud dedicada</li>
                  <li>Soporte técnico prioritario 24/7</li>
                </ul>
                <Link href="/register" className="mt-auto w-full border border-subtle rounded-lg font-semibold py-2 text-primary dark:text-primary hover:underline">
                  Contactar Ventas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary dark:text-white mb-6">
            Preguntas Frecuentes
          </h2>
          <p className="text-lg text-muted dark:text-muted mb-12">
            Resuelve tus dudas sobre la integración y funcionamiento
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card dark:bg-card rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary dark:text-primary mb-2">
              ¿Cómo funciona el auto‑corte en MikroTik?
            </h3>
            <p className="text-base text-muted dark:text-muted">
              SaaS TOI se conecta de forma segura a la API REST de RouterOS 7+ mediante puerto HTTPS cifrado con AES‑256‑GCM. Cuando una cuenta vence, deshabilita automáticamente el secreto PPPoE o regla IP del abonado.
            </p>
          </div>

          <div className="bg-card dark:bg-card rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary dark:text-primary mb-2">
              ¿Requiero aprobación de Meta para usar WhatsApp?
            </h3>
            <p className="text-base text-muted dark:text-muted">
              No, la plataforma te guía en el proceso oficial de Meta WhatsApp Cloud API mediante login directo o tus propias credenciales WABA de Meta Developer Console.
            </p>
          </div>

          <div className="bg-card dark:bg-card rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-primary dark:text-primary mb-2">
              ¿Mis datos están seguros entre organizaciones?
            </h3>
            <p className="text-base text-muted dark:text-muted">
              Sí, implementamos arquitectura Multi‑Tenant estricta con aislamiento lógico mediante `organization_id` en todas las consultas y almacenamiento cifrado en Amazon S3.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-subtle py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col flex-sm-row justify-between gap-4 text-muted dark:text-muted">
          <div>&copy; 2026 SaaS TOI ISP Platform. Todos los derechos reservados.</div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/data-deletion" className="hover:underline">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}