import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AAM Accounting Automation',
  description: 'AI-driven accounting system for Japanese tax compliance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50 pt-16">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}