import './globals.css'

export const metadata = {
  title: 'Sistema de Gestión - El Portal de Tocancipá',
  description: 'Sistema de Gestión Administrativa Agrupación El Portal de Tocancipá',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
