import React from 'react';
import { getServerSession, requireSession } from '@/lib/auth';
import { Sidebar } from './_components/sidebar';
import { Header } from '@/app/(dashboard)/_components/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  // requireSession() se ejecuta en el middleware, pero una doble verificación aquí es segura.
  // Si la sesión es nula, el middleware ya habría redirigido a /login.

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar user={session!.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={session!.user} organization={session!.organization} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 dark:bg-gray-800 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}