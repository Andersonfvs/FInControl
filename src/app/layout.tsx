import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinControl - Controle Financeiro',
  description: 'Sistema de controle financeiro familiar',
  icons: {
    icon: '/logo-fincontrol.png',
    apple: '/logo-fincontrol.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Anti-flash: aplica o tema salvo antes do primeiro render */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('fincontrol-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var isDark = t !== null ? t === 'dark' : prefersDark;
                if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
