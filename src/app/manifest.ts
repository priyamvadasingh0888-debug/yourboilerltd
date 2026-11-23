import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Your Boiler Ltd - Engineer Portal',
    short_name: 'Boiler PWA',
    description: 'Field Service & Gas Safe Engineer Operations Terminal for Your Boiler Ltd.',
    start_url: '/engineer',
    display: 'standalone',
    background_color: '#f3f4f7',
    theme_color: '#111215',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
