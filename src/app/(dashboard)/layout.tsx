import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { Sidebar } from './_components/sidebar';
import { Header } from './_components/header';

// Every page in this route group depends on the request's session cookie.
// Prevent Next.js from trying to statically prerender authenticated pages at build time.
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // Middleware normally handles this, but keep the layout safe if it is reached
  // directly (for example, during an internal render).
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar user={session} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={session} organization={session} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 dark:bg-gray-800 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
