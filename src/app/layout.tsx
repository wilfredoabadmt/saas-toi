import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SaaS TOI — Gestión & Cobranza ISP",
  description: "Plataforma multi-tenant de cobranza y atención por WhatsApp Cloud API para ISPs",
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
