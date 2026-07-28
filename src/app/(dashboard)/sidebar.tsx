'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Tipos importados desde tu schema o un archivo de tipos dedicado
type User = {
    id: string;
    name: string | null;
    email: string;
    role: 'admin' | 'super_admin' | 'technician' | 'billing';
};

export function Sidebar({ user }: { user: User }) {
    const pathname = usePathname();

    const navLinks = [
        { href: '/dashboard', label: 'Inicio' },
        { href: '/subscribers', label: 'Abonados' },
        { href: '/plans', label: 'Planes' },
        // ... otros enlaces
    ];

    if (user.role === 'super_admin') {
        navLinks.push({ href: '/super-admin/tenants', label: 'Tenants' });
    }

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 p-4 flex flex-col">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-8">SaaS TOI</div>
            <nav className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={`px-4 py-2 rounded-md ${pathname === link.href ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {link.label}
                    </Link>
                ))}
            </nav>
            {/* ... más elementos del sidebar ... */}
        </aside>
    );
}