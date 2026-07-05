import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';

// Menggunakan v40 untuk memaksa browser membuang cache ikon lama (ikon Firebase)
const ICON_URL = "/icon-logo.webp?v=40";

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
      { url: ICON_URL, type: 'image/webp', sizes: '32x32' },
      { url: ICON_URL, type: 'image/webp', sizes: '192x192' },
      { url: ICON_URL, type: 'image/webp', sizes: '512x512' },
    ],
    shortcut: [ICON_URL],
    apple: [
      { url: ICON_URL, sizes: '180x180', type: 'image/webp' },
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
        {/* Explicit override: Memaksa browser menggunakan logo Portal SPMB di atas cache favicon.ico lama */}
        <link rel="icon" href={ICON_URL} />
        <link rel="shortcut icon" href={ICON_URL} />
        <link rel="apple-touch-icon" href={ICON_URL} />
        
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
