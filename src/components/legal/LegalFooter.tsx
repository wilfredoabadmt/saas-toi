'use client';

import React from 'react';
import Link from 'next/link';

export function LegalFooter() {
  return (
    <footer className="mt-20 border-t border-white/[0.08] bg-[#060709]/90 backdrop-blur-2xl py-12 text-slate-400 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Compliance Badges Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-10 border-b border-white/[0.06]">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-lg">
              🔐
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">AES-256-GCM</div>
              <div className="text-[11px] text-slate-400">Tokens WABA & Secretos Cifrados</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-lg">
              🏢
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Aislamiento Multi-Tenant</div>
              <div className="text-[11px] text-slate-400">Indexación Estricta por Tenant ID</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg">
              💬
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">WhatsApp Utility Opt-In</div>
              <div className="text-[11px] text-slate-400">Cumplimiento Meta Messaging</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg">
              🛡️
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Meta App Review</div>
              <div className="text-[11px] text-slate-400">Cumplimiento Developer Policies</div>
            </div>
          </div>
        </div>

        {/* Links and Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base">SaaS TOI</span>
              <span className="text-xs text-slate-400">ISP Telecom Operations Platform</span>
            </div>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} SaaS TOI. Todos los derechos reservados.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
            <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors no-underline">
              Política de Privacidad
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors no-underline">
              Términos de Servicio
            </Link>
            <Link href="/data-deletion" className="text-slate-400 hover:text-white transition-colors no-underline">
              Eliminación de Datos
            </Link>
            <a href="mailto:privacy@saas-toi.com" className="text-blue-400 hover:text-blue-300 transition-colors no-underline">
              privacy@saas-toi.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
