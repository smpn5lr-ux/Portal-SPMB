
import { MetadataRoute } from 'next'

const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/studio-8340795105-269f9.firebasestorage.app/o/logo.png?alt=media&token=c272e094-a169-42b7-a3aa-e8838d77c413";
const ICON_URL = `${LOGO_URL}&v=2`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Portal SPMB | Sistem Pendaftaran Murid Baru',
    short_name: 'Portal SPMB',
    description: 'Sistem informasi manajemen pendaftaran murid baru modern berbasis standar Dapodik.',
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
