import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'El Ojo de Dios // México - Centro de Monitoreo Geoespacial',
  description:
    'Plataforma de inteligencia geoespacial en tiempo real para los Estados Unidos Mexicanos: sismos, tráfico aéreo, embarcaciones AIS, incendios, clima, tráfico vial y cámaras web.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased bg-[#04070d] text-slate-100 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
