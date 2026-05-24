import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import Providers from './providers'
import AppNav from '@/components/AppNav'
import GlobalSearch from '@/components/GlobalSearch'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Implant ID',
  description: 'The modern database for MRI-conditional implants.',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AppNav />
          <GlobalSearch />
          {children}
        </Providers>
      </body>
    </html>
  )
}
