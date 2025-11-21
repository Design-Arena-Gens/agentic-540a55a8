import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Desktop Agent Control',
  description: 'Control your desktop applications remotely',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
