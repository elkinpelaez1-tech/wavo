import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wavo — Mensajes que llegan',
  description: 'Plataforma de mensajería masiva WhatsApp Business',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
