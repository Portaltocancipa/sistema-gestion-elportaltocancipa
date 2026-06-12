'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const roleLabels = {
  admin_plataforma: 'Administrador Plataforma',
  admin_copropiedad: 'Administrador',
  contador: 'Contador',
  tesorero: 'Tesorero',
  presidente_consejo: 'Presidente del Consejo',
  secretario_consejo: 'Secretario del Consejo',
  vocal_consejo: 'Vocal del Consejo',
  convivencia: 'Convivencia',
  copropietario: 'Copropietario',
}

const accesos = {
  admin_plataforma: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general del sistema' },
    { href: '/dashboard/compras', icon: '🛒', label: 'Compras', desc: 'Ver solicitudes de compra' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
    { href: '/dashboard/usuarios', icon: '👥', label: 'Usuarios', desc: 'Administrar cuentas' },
    { href: '/dashboard/parametros', icon: '⚙️', label: 'Parámetros', desc: 'Tipos y categorías' },
  ],
  admin_copropiedad: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general' },
    { href: '/dashboard/compras', icon: '🛒', label: 'Compras', desc: 'Solicitudes de compra' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
  ],
  contador: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general' },
    { href: '/dashboard/compras', icon: '🛒', label: 'Compras', desc: 'Solicitudes de compra' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
  ],
  tesorero: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general' },
    { href: '/dashboard/compras', icon: '🛒', label: 'Compras', desc: 'Gestión de pagos y facturas' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
  ],
  presidente_consejo: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general' },
    { href: '/dashboard/compras', icon: '🛒', label: 'Compras', desc: 'Aprobar solicitudes' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
  ],
  secretario_consejo: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general' },
    { href: '/dashboard/compras', icon: '🛒', label: 'Compras', desc: 'Aprobar y gestionar compras' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
  ],
  vocal_consejo: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general' },
    { href: '/dashboard/compras', icon: '🛒', label: 'Compras', desc: 'Gestión de compras' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
  ],
  convivencia: [
    { href: '/dashboard/estadisticas', icon: '📊', label: 'Estadísticas', desc: 'Dashboard general' },
    { href: '/dashboard/tickets', icon: '🎫', label: 'Tickets', desc: 'Gestión de solicitudes' },
  ],
  copropietario: [
    { href: '/dashboard/tickets', icon: '🎫', label: 'Mis Tickets', desc: 'Ver y crear solicitudes' },
  ],
}

export default function DashboardHome() {
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (!d.user) router.push('/login'); else setUser(d.user) })
  }, [])

  if (!user) return <div className="p-8 text-center text-slate-400">Cargando...</div>

  const links = accesos[user.role] || []

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Bienvenido, {user.full_name}</h1>
        <p className="text-slate-500 text-sm mt-1">{roleLabels[user.role]} · Agrupación de Vivienda Portal de Tocancipá</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-green-400 hover:shadow-md transition-all group">
            <div className="text-3xl mb-3">{l.icon}</div>
            <p className="font-semibold text-slate-800 group-hover:text-green-800">{l.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
