import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinControl - Controle Financeiro',
  description: 'Sistema de controle financeiro familiar',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}