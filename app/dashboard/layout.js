'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const menuItems = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠', roles: ['admin_plataforma','admin_copropiedad','contador','tesorero','presidente_consejo','secretario_consejo','vocal_consejo','convivencia','copropietario'] },
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: '👥', roles: ['admin_plataforma'] },
  { href: '/dashboard/parametros', label: 'Parámetros', icon: '⚙️', roles: ['admin_plataforma','admin_copropiedad'] },
  { href: '/dashboard/compras', label: 'Compras', icon: '🛒', roles: ['admin_plataforma','admin_copropiedad','contador','tesorero','presidente_consejo','secretario_consejo','vocal_consejo'] },
  { href: '/dashboard/tickets', label: 'Tickets', icon: '🎫', roles: ['admin_plataforma','admin_copropiedad','contador','tesorero','presidente_consejo','secretario_consejo','vocal_consejo','convivencia','copropietario'] },
]

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user) router.push('/login')
        else setUser(data.user)
      })
      .catch(() => router.push('/login'))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const filteredMenu = user ? menuItems.filter(item => item.roles.includes(user.role)) : []

  const roleLabels = {
    admin_plataforma: 'Administrador Plataforma',
    admin_copropiedad: 'Administrador',
    contador: 'Contador',
    tesorero: 'Tesorero',
    presidente_consejo: 'Presidente Consejo',
    secretario_consejo: 'Secretario Consejo',
    vocal_consejo: 'Vocal Consejo',
    convivencia: 'Convivencia',
    copropietario: 'Copropietario',
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-green-900 text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="flex items-center justify-between p-4 border-b border-green-700">
          {sidebarOpen && (
            <div>
              <span className="font-bold text-sm leading-tight block">El Portal</span>
              <span className="text-xs text-green-300 leading-tight">de Tocancipá</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-green-300 hover:text-white">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="flex-1 py-4">
          {filteredMenu.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-green-700 ${pathname === item.href ? 'bg-green-700 border-l-4 border-orange-400' : 'border-l-4 border-transparent'}`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-green-700">
          {sidebarOpen && user && (
            <div className="mb-3">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-green-300">{roleLabels[user.role]}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-green-300 hover:text-white transition-colors"
          >
            <span>🚪</span>
            {sidebarOpen && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
