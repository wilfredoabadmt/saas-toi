import React from 'react';
import Link from 'next/link';
import { LegalHeader } from '@/components/legal/LegalHeader';
import { LegalFooter } from '@/components/legal/LegalFooter';

export const metadata = {
  title: 'Términos y Condiciones de Servicio | SaaS TOI',
  description: 'Condiciones de uso, políticas de uso aceptable de WhatsApp Cloud API, responsabilidades del ISP e integración con Meta Platforms.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#060709] text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col">
      <LegalHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Hero Banner */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <span>📜 Terms of Service & Commerce Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Términos y Condiciones del Servicio
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            Acuerdo legal y condiciones de uso aplicables al uso del SaaS TOI ISP, la automatización de infraestructura y el canal de mensajería comercial WhatsApp Cloud API.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span>Última actualización: 26 de Julio de 2026</span>
            <span>•</span>
            <span>SaaS ISP Terms v3.1</span>
          </div>
        </div>

        {/* Legal Content Cards */}
        <div className="space-y-8">

          {/* Section 1 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                01
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">1. Aceptación del Contrato & Objeto</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              El presente contrato rige el acceso y uso de la plataforma SaaS TOI por parte del Proveedor de Servicios de Internet (en adelante, el &quot;ISP&quot; o &quot;Cliente&quot;). Al registrarse o utilizar el servicio, el ISP acepta íntegramente estas condiciones y declara contar con las facultades legales para contratar.
            </p>
          </section>

          {/* Section 2 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                02
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">2. Uso Aceptable & Políticas de Meta Platforms</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              El uso de la integración de <strong>WhatsApp Cloud API</strong> exige el cumplimiento obligatorio y estricto de las directrices fijadas por Meta Platforms, Inc., incluyendo la <em>WhatsApp Business Messaging Policy</em> y la <em>Meta Commerce Policy</em>:
            </p>
            <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside pl-2">
              <li><strong>Prohibición Absoluta de SPAM:</strong> Queda terminantemente prohibido el envío masivo no solicitado, mensajes promocionales fuera de ventana comercial o acoso en procesos de cobranza.</li>
              <li><strong>Categoría UTILITY Obligatoria:</strong> Los avisos de facturación y recordatorios transaccionales deben enviarse exclusivamente bajo plantillas aprobadas en categoría Utility.</li>
              <li><strong>Suspensión Inmediata por Infracción:</strong> Si Meta detecta degradación del <em>Quality Rating</em> de la WABA del ISP o violaciones de política, SaaS TOI se reserva el derecho de pausar el canal para proteger la reputación del dominio.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                03
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">3. Consentimiento (Opt-In) de los Abonados</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              El ISP es el único y exclusivo responsable de haber recolectado y documentado la autorización previa, expresa e informada (<strong>Opt-In</strong>) de sus abonados para recibir notificaciones relativas a su servicio de internet, comprobantes y soporte mediante WhatsApp. SaaS TOI actúa únicamente como procesador de mensajería (Data Processor) bajo las instrucciones del ISP.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                04
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">4. Niveles de Servicio (SLA) & Limitación de Responsabilidad</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                <strong>Garantía SLA de Plataforma:</strong> SaaS TOI se compromete a mantener una disponibilidad del 99.5% del sistema de gestión y motores de webhook de la plataforma.
              </p>
              <p>
                <strong>Exención de Responsabilidad por Infraestructura de Terceros:</strong> SaaS TOI no responderá por interrupciones, latencia o fallas derivadas de caídas globales de la red de Meta Platforms (Graph API / WhatsApp), proveedores de servicios en la nube de terceros, o fallas en el suministro eléctrico o físico de la red del ISP.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                05
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">5. Revocación del Servicio & Eliminación de Datos</h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              El ISP o sus usuarios pueden rescindir el servicio o solicitar la purga de sus credenciales WABA en cualquier momento. Para obtener información detallada sobre el procedimiento de revocación y borrado definitivo, consulte nuestras{' '}
              <Link href="/data-deletion" className="text-purple-400 font-semibold hover:underline">
                Instrucciones de Eliminación de Datos
              </Link>.
            </p>
          </section>

        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
