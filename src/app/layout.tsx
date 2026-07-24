import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaaS TOI — Plataforma de Cobranza ISP",
  description: "Plataforma multi-tenant de cobranza automatizada y atención por WhatsApp Cloud API para ISPs",
  icons: {
    icon: "/favicon.webp",
    shortcut: "/favicon.webp",
    apple: "/favicon.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
