import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AAM Accounting',
  description: 'Professional Accounting Services',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    nocache: true,
  },
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* ナビゲーションなし、シンプルなレイアウト */}
      <main className="min-h-screen bg-white">
        {children}
      </main>
      <Toaster position="top-right" />
    </>
  )
}