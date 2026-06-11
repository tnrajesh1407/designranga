import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'designranga Admin',
  description: 'Product upload dashboard for designranga.com',
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  )
}
