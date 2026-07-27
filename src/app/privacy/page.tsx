import React from 'react';
import Link from 'next/link';
import { LegalHeader } from '@/components/legal/LegalHeader';
import { LegalFooter } from '@/components/legal/LegalFooter';

export const metadata = {
  title: 'Política de Privacidad | SaaS TOI - Meta WhatsApp Cloud API Compliance',
  description: 'Política de privacidad y protección de datos personales para la plataforma SaaS TOI ISP y la integración de Meta WhatsApp Cloud API.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#060709] text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col">
      <LegalHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Hero Banner */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <span>🔒 Meta Tech Provider Privacy Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Política de Privacidad & Tratamiento de Datos
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            Esta política describe cómo SaaS TOI recopila, protege y utiliza la información procesada a través de la integración oficial de Meta WhatsApp Cloud API y el sistema de automatización para ISPs.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span>Última actualización: 26 de Julio de 2026</span>
            <span>•</span>
            <span>Versión 2.4 - Meta Developer Compliance</span>
          </div>
        </div>

        {/* Legal Content Cards Container */}
        <div className="space-y-8">
          
          {/* Section 1 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                01
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">1. Información General & Alcance</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              SaaS TOI es una solución integral multi-tenant de gestión de operaciones, cobranza automatizada y soporte técnico omnicanal para Proveedores de Servicios de Internet (ISPs). Operamos como <strong>Tech Provider autorizado</strong> interactuando con la API oficial de <strong>Meta WhatsApp Cloud API</strong> (Meta Platforms, Inc.). Nos comprometemos rigurosamente a la custodia, confidencialidad y aislamiento de la información.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                02
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">2. Datos Recopilados & Identificadores Meta</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Para prestar los servicios de cobranza recurrente y mensajería de utilidad (Utility), recopilamos estrictamente los datos indispensables:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Identificadores Meta & WABA</h3>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>WhatsApp Business Account ID (WABA ID).</li>
                  <li>Phone Number ID & Tokens de Acceso Meta.</li>
                  <li>Identificadores de plantilla (Utility templates).</li>
                  <li>Firma criptográfica HMAC-SHA256 de webhooks.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Información de Abonados del ISP</h3>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Nombre completo, teléfono de WhatsApp y correo.</li>
                  <li>Estado de cuenta, plan de internet y saldo pendiente.</li>
                  <li>Comprobantes de pago cargados voluntariamente.</li>
                  <li>Historial de tickets y soporte en Inbox.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                03
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">3. Uso de la Información & Operación de Webhooks</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              La información procesada se destina exclusivamente a las siguientes finalidades operativas:
            </p>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside pl-2">
              <li><strong>Notificaciones Transaccionales (Utility):</strong> Envío automatizado de avisos de vencimiento, facturación y confirmación de pago autorizados por Meta.</li>
              <li><strong>Procesamiento de Webhooks Meta:</strong> Recepción síncrona idempotente de eventos de mensajes salientes/entrantes (`wamid`) para actualización de estado.</li>
              <li><strong>Automatización MikroTik:</strong> Ejecución de órdenes de corte y reconexión automática de tráfico de red basadas en la acreditación de pagos.</li>
              <li><strong>Soporte Omnicanal:</strong> Atención a consultas registradas por abonados a través del CRM Multi-Agente del ISP.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                04
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">4. Seguridad, Cifrado AES-256 & Cero Venta de Datos</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                <strong>Cifrado en Reposo (AES-256-GCM):</strong> Todos los secretos de infraestructura, credenciales de routers MikroTik y tokens de acceso de Meta WABA son cifrados de forma estricta en la base de datos utilizando el algoritmo criptográfico de grado militar AES-256-GCM.
              </p>
              <p>
                <strong>Aislamiento Multi-Tenant Estricto:</strong> Toda tabla de base de datos indexa obligatoriamente la clave <code>organization_id</code> para imposibilitar la fuga o cruce involuntario de información entre empresas clientes.
              </p>
              <p>
                <strong>Cero Venta a Terceros:</strong> SaaS TOI no vende, comercializa, alquila ni transfiere datos de usuarios ni abonados a anunciantes, brokers de datos o terceros ajenos a la prestación del servicio.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                05
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">5. Derechos ARCO & Supresión de Datos</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Cualquier usuario o titular de datos personales puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) o solicitar la eliminación total de sus registros de la WABA visitando directamente la página pública de{' '}
              <Link href="/data-deletion" className="text-blue-400 font-semibold hover:underline">
                Eliminación de Datos Meta
              </Link>{' '}
              o contactando a nuestro Oficial de Privacidad en <code>privacy@saas-toi.com</code>.
            </p>
          </section>

        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
