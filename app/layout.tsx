import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/navigation'
import { Toaster } from 'react-hot-toast'
import EnhancedMastraChat from '@/components/EnhancedMastraChat'
// import ChatbotEmbed from '@/components/ChatbotEmbed' // Intercom設定が不完全なため一時的に無効化
// import { AppInitializer } from './app'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AAM Accounting Automation',
  description: 'AI-driven accounting system for Japanese tax compliance',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    nocache: true,
  },
  openGraph: {
    title: 'AAM Accounting Automation',
    description: 'AI-driven accounting system for Japanese tax compliance',
    images: [
      {
        url: '/images/ogp-logo.jpg',
        width: 1200,
        height: 630,
        alt: 'AAM Accounting Automation',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AAM Accounting Automation',
    description: 'AI-driven accounting system for Japanese tax compliance',
    images: ['/images/ogp-logo.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Navigation />
        <main className="min-h-screen bg-gray-50 pt-24 lg:pt-16">
          {children}
        </main>
        <Toaster position="top-right" />
        <EnhancedMastraChat />
        {/* <ChatbotEmbed /> */} {/* Intercom設定が不完全なため一時的に無効化 */}
      </body>
    </html>
  )
}