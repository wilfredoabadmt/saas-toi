'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function LegalHeader() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/privacy', label: 'Política de Privacidad', icon: '🔒' },
    { href: '/terms', label: 'Términos de Servicio', icon: '📜' },
    { href: '/data-deletion', label: 'Eliminación de Datos', icon: '🗑️' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#060709]/80 border-b border-white/[0.08] shadow-2xl transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="group flex items-center gap-3 text-white no-underline transition-all duration-300 hover:opacity-90"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300">
                <div className="w-full h-full bg-[#080A0E] rounded-[11px] flex items-center justify-center font-extrabold text-blue-400 text-lg">
                  T
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                    SaaS TOI
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full">
                    ISP Edition
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Meta WhatsApp Cloud API & MikroTik Automation
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-full bg-slate-900/60 border border-white/[0.08] backdrop-blur-md shadow-inner">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 no-underline ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-sm">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action & Compliance Badge */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Meta Tech Provider Verified</span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] transition-all duration-300 no-underline shadow-sm hover:border-white/[0.2]"
            >
              <span>← Landing Page</span>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-between pb-3 pt-1 border-t border-white/[0.04] gap-1 overflow-x-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 text-center py-2 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200 whitespace-nowrap no-underline ${
                  isActive
                    ? 'bg-blue-600/90 text-white border border-blue-400/40'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/40'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
