
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';

const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/studio-8340795105-269f9.firebasestorage.app/o/logo.png?alt=media&token=c272e094-a169-42b7-a3aa-e8838d77c413";
// Menambahkan cache busting v=10 untuk memaksa browser mengganti ikon lama
const ICON_URL = `${LOGO_URL}&v=10`;

export const viewport: Viewport = {
  themeColor: '#4361ee',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Portal SPMB | Sistem Pendaftaran Murid Baru',
  description: 'Sistem informasi manajemen pendaftaran murid baru (PPDB/SPMB) modern berbasis standar Dapodik.',
  manifest: '/manifest',
  icons: {
    icon: [
      { url: ICON_URL, sizes: 'any' },
      { url: ICON_URL, type: 'image/png', sizes: '32x32' },
      { url: ICON_URL, type: 'image/png', sizes: '192x192' },
    ],
    shortcut: [ICON_URL],
    apple: [
      { url: ICON_URL, sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Portal SPMB',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
