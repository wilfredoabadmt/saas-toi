'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export interface HeaderUser {
  userName?: string;
  userEmail?: string;
  role?: string;
  organizationName?: string;
}

export function Header({ user, organization }: { user?: HeaderUser | null; organization?: HeaderUser | null }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      // Redirect to the landing page (sales landing at /)
      window.location.href = '/';
    } catch (err) {
      console.error('Error logging out:', err);
      window.location.href = '/';
    }
  };

  const displayName = user?.userName || organization?.userName || 'Usuario Demo';
  const orgName = user?.organizationName || organization?.organizationName || 'ISP Demo Internet';
  const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : user?.role ? user.role.toUpperCase() : 'ADMIN ISP';

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm shrink-0">
      {/* Organization Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 5h4m-4-8a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          <span className="text-xs font-semibold text-slate-200">{orgName}</span>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        {/* User Profile & Role */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-100">{displayName}</span>
            <span className="text-[10px] font-semibold text-indigo-400">{roleLabel}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs border border-indigo-500 shadow-sm">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>{loggingOut ? 'Saliendo...' : 'Cerrar Sesión'}</span>
        </button>
      </div>
    </header>
  );
}
