
import { MetadataRoute } from 'next'

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
        src: 'https://picsum.photos/seed/school/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: 'https://picsum.photos/seed/school/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
  }
}
