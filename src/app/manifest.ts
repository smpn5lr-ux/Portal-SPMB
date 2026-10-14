
import { MetadataRoute } from 'next'

// Menggunakan v=200 agar sinkron dengan layout dan menghancurkan cache browser
const ICON_URL = "/icon-logo.png?v=200";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SIS TERPADU | Sistem Informasi Sekolah Terpadu',
    short_name: 'SIS TERPADU',
    description: 'Sistem informasi manajemen sekolah terpadu modern berbasis standar Dapodik.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1120',
    theme_color: '#4361ee',
    icons: [
      {
        src: ICON_URL,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: ICON_URL,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
  }
}
