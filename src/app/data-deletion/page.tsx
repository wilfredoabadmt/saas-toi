import React from 'react';
import { LegalHeader } from '@/components/legal/LegalHeader';
import { LegalFooter } from '@/components/legal/LegalFooter';
import { DataDeletionForm } from '@/components/legal/DataDeletionForm';

export const metadata = {
  title: 'Instrucciones de Eliminación de Datos Meta | SaaS TOI',
  description: 'Instrucciones paso a paso para la revocación de la aplicación en Meta Business Manager y formulario interactivo de supresión de datos de WhatsApp WABA.',
};

export default function DataDeletionInstructionsPage() {
  return (
    <div className="min-h-screen bg-[#060709] text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col">
      <LegalHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Hero Banner */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <span>🗑️ Meta User Data Deletion Instructions</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Instrucciones para la Eliminación de Datos
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
            De acuerdo con las políticas para desarrolladores de Meta Platforms, Inc. (Facebook Platform Data Deletion Policy), los usuarios e ISPs tienen derecho a revocar accesos y solicitar la eliminación permanente de sus datos personales y tokens WABA.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
            <span>Meta Graph API Data Deletion Standard Compliance</span>
          </div>
        </div>

        {/* Step-by-Step Meta Revocation Guide */}
        <div className="space-y-8 mb-12">
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">
                01
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Guía de Revocación Directa en Meta Business Manager
              </h2>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed">
              Si ha conectado su cuenta de WhatsApp Business (WABA) mediante nuestro Embedded Signup o Facebook Login, puede revocar el acceso de la aplicación en cualquier momento desde la configuración de su cuenta de Meta:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-extrabold flex items-center justify-center text-xs">
                  1
                </div>
                <h3 className="text-xs font-bold text-white">Acceda a Meta Business</h3>
                <p className="text-xs text-slate-400">
                  Inicie sesión en su panel de{' '}
                  <a href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                    Meta Business Manager
                  </a>{' '}
                  o Configuración de Integraciones de Facebook.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-extrabold flex items-center justify-center text-xs">
                  2
                </div>
                <h3 className="text-xs font-bold text-white">Localice SaaS TOI</h3>
                <p className="text-xs text-slate-400">
                  Vaya a <em>Configuración del Negocio &gt; Integraciones &gt; Aplicaciones de WhatsApp Business</em> y seleccione la app <strong>SaaS TOI ISP</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-extrabold flex items-center justify-center text-xs">
                  3
                </div>
                <h3 className="text-xs font-bold text-white">Revoque Accesos</h3>
                <p className="text-xs text-slate-400">
                  Haga clic en <strong>Eliminar acceso / Desvincular</strong>. Meta enviará automáticamente una notificación de revocación a nuestro callback de la plataforma.
                </p>
              </div>
            </div>
          </section>

          {/* Data Deletion Callback Info for Meta Reviewers */}
          <section className="p-6 sm:p-8 rounded-3xl bg-[#0F1218]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                02
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Data Deletion Callback Endpoint (Meta App Reviewers)
              </h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Para los evaluadores de Meta App Review, nuestra plataforma procesa las solicitudes de eliminación mediante callback síncrono que retorna la estructura oficial de respuesta JSON (con <code>url</code> de estado y <code>confirmation_code</code> único):
            </p>
            <div className="p-4 rounded-2xl bg-black/70 border border-white/[0.1] font-mono text-xs text-blue-300 overflow-x-auto">
              <span className="text-emerald-400">POST</span> https://saas-toi.com/api/data-deletion
              <br />
              <span className="text-slate-500">{`// O alternativamente:`}</span>
              <br />
              <span className="text-emerald-400">POST</span> https://saas-toi.com/api/legal/data-deletion
            </div>
          </section>
        </div>

        {/* Interactive Data Deletion Request Form */}
        <section className="mb-12">
          <DataDeletionForm />
        </section>

      </main>

      <LegalFooter />
    </div>
  );
}
