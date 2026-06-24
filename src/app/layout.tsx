import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import Providers from './providers'
import AppNav from '@/components/AppNav'
import CookieBanner from '@/components/CookieBanner'
// GlobalSearch removed — master admin now uses the live Convex-backed search in MasterShell

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
        {/* Graceful fallback for browsers too old to run the app (iOS < 13.4, Chrome < 85) */}
        <script dangerouslySetInnerHTML={{__html:`if(typeof String.prototype.replaceAll==='undefined'){document.addEventListener('DOMContentLoaded',function(){var e=document.createElement('div');e.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:#0a0f1a;color:#fff;z-index:99999;text-align:center;padding:60px 24px;box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif';e.innerHTML='<p style="font-size:36px;margin:0 0 20px">⚠️</p><h2 style="font-size:20px;font-weight:600;margin:0 0 10px">Browser not supported</h2><p style="font-size:14px;color:rgba(255,255,255,.6);max-width:300px;margin:0 auto;line-height:1.6">Please update Chrome or use a newer device to access Implant ID.</p>';document.body.appendChild(e)})}`}} />
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
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}