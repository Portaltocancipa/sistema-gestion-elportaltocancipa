'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, PieChart, Pie, Cell
} from 'recharts'

const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const STATUS_COLORS = {
  'Enviada': '#3b82f6', 'Aprobada': '#10b981', 'Rechazada': '#ef4444',
  'Compra Directa': '#f59e0b', 'En Gestión': '#8b5cf6',
  'Factura': '#f97316', 'F. Devuelta': '#dc2626', 'Pagado': '#059669', 'Retirada': '#94a3b8'
}
const TICKET_COLORS = { 'Abierto': '#3b82f6', 'En Gestión': '#f59e0b', 'Pendiente': '#f97316', 'Resuelto': '#10b981', 'Cerrado': '#64748b' }
const PRIORITY_COLORS = { baja: '#94a3b8', normal: '#3b82f6', alta: '#f97316', urgente: '#ef4444' }
const CHART_PALETTE = ['#15803d','#ea580c','#7c3aed','#0891b2','#db2777','#d97706','#16a34a','#dc2626']

function KpiCard({ icon, label, value, sub, color = 'green' }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
    red: 'bg-red-50 border-red-200 text-red-700',
  }
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${colors[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs font-medium opacity-70">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : p.value}</strong></p>
      ))}
    </div>
  )
}

const COMPRAS_ROLES = ['admin_plataforma','admin_copropiedad','contador','tesorero','presidente_consejo','secretario_consejo','vocal_consejo']

export default function EstadisticasPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [ticketView, setTicketView] = useState('general')
  const [ticketDataMios, setTicketDataMios] = useState(null)
  const [loadingMios, setLoadingMios] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]).then(([dashData, meData]) => {
      setData(dashData)
      const role = meData.user?.role
      setUserRole(role)
      setTab(COMPRAS_ROLES.includes(role) ? 'compras' : 'tickets')
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleTicketView = async (view) => {
    setTicketView(view)
    if (view === 'mios' && !ticketDataMios) {
      setLoadingMios(true)
      const d = await fetch('/api/dashboard?view=mios').then(r => r.json())
      setTicketDataMios(d.tickets)
      setLoadingMios(false)
    }
  }

  if (loading || !tab) return (
    <div className="p-8 flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-800 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Cargando estadísticas...</p>
      </div>
    </div>
  )

  if (!data) return <div className="p-8 text-center text-slate-400">No se pudieron cargar los datos</div>

  const { compras: c, tickets: tGeneral } = data
  const t = (userRole === 'admin_plataforma' && ticketView === 'mios') ? (ticketDataMios || tGeneral) : tGeneral
  const puedeVerCompras = COMPRAS_ROLES.includes(userRole)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estadísticas</h1>
          <p className="text-slate-500 text-sm">Resumen general del sistema</p>
        </div>
        <div className="flex gap-2">
          {puedeVerCompras && (
            <button onClick={() => setTab('compras')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'compras' ? 'bg-green-800 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              🛒 Compras
            </button>
          )}
          <button onClick={() => setTab('tickets')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'tickets' ? 'bg-green-800 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            🎫 Tickets
          </button>
        </div>
      </div>

      {tab === 'compras' && c && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon="📋" label="Total Solicitudes" value={c.totalCompras} color="slate" />
            <KpiCard icon="⏳" label="Pendientes" value={c.pendientes} sub="esperando aprobación" color="orange" />
            <KpiCard icon="✅" label="Aprobadas" value={c.aprobadas} sub="en proceso" color="green" />
            <KpiCard icon="💰" label="Pagadas" value={c.pagadas} color="green" />
            <KpiCard icon="💵" label="Monto Solicitado" value={fmt(c.montoTotal)} color="blue" />
            <KpiCard icon="✅" label="Monto Pagado" value={fmt(c.montoPagado)} color="green" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Tendencia mensual — últimos 6 meses</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={c.tendencia} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803d" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="solicitudes" name="Solicitudes" stroke="#15803d" strokeWidth={2} fill="url(#colorSol)" dot={{ r: 4, fill: '#15803d' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Por estado</h2>
              {c.porEstado.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={c.porEstado} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {c.porEstado.map((entry, i) => (
                          <Cell key={i} fill={STATUS_COLORS[entry.estado] || CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {c.porEstado.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[e.estado] || CHART_PALETTE[i % CHART_PALETTE.length] }} />
                          <span className="text-slate-600">{e.estado}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{e.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-slate-400 text-sm text-center mt-8">Sin datos</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Solicitudes por categoría</h2>
              {c.porCategoria.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={c.porCategoria} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" name="Solicitudes" radius={[0, 4, 4, 0]}>
                      {c.porCategoria.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-400 text-sm text-center mt-8">Sin datos</p>}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-bold text-slate-700 mb-3">Por prioridad</h2>
                <div className="grid grid-cols-2 gap-3">
                  {c.porPrioridad.map((p, i) => (
                    <div key={i} className="rounded-lg p-3 text-center" style={{ background: PRIORITY_COLORS[p.prioridad] + '20', border: `1px solid ${PRIORITY_COLORS[p.prioridad]}40` }}>
                      <p className="text-xs capitalize font-medium" style={{ color: PRIORITY_COLORS[p.prioridad] }}>{p.prioridad}</p>
                      <p className="text-2xl font-bold text-slate-800">{p.cantidad}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-bold text-slate-700 mb-4">Monto solicitado mensual</h2>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={c.tendencia} margin={{ top: 0, right: 5, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="monto" name="Monto" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'tickets' && t && (
        <>
          {userRole === 'admin_plataforma' && (
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => handleTicketView('general')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${ticketView === 'general' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                📊 Vista General
              </button>
              <button
                onClick={() => handleTicketView('mios')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${ticketView === 'mios' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                👤 Asignados a mí
              </button>
            </div>
          )}

          {loadingMios ? (
            <div className="text-center py-8 text-slate-400 text-sm">Cargando mis tickets...</div>
          ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard icon="🎫" label={ticketView === 'mios' ? 'Mis Tickets' : 'Total Tickets'} value={t.totalTickets} color="slate" />
            <KpiCard icon="🔓" label="Abiertos / En Gestión" value={t.ticketsAbiertos} color="orange" />
            <KpiCard icon="🚨" label="Urgentes" value={t.ticketsUrgentes} color="red" />
          </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Distribución por estado</h2>
              {t.ticketPorEstado.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={t.ticketPorEstado} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {t.ticketPorEstado.map((entry, i) => (
                          <Cell key={i} fill={TICKET_COLORS[entry.estado] || CHART_PALETTE[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {t.ticketPorEstado.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: TICKET_COLORS[e.estado] || CHART_PALETTE[i] }} />
                        <span className="text-slate-600">{e.estado}</span>
                        <span className="font-bold text-slate-800 ml-auto">{e.cantidad}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-slate-400 text-sm text-center mt-8">Sin datos</p>}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-center items-center">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-green-50 border-4 border-green-200 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl font-bold text-green-800">{t.totalTickets > 0 ? Math.round(((t.totalTickets - t.ticketsAbiertos) / t.totalTickets) * 100) : 0}%</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Tasa de resolución</p>
                  <p className="text-xs text-slate-400">{t.totalTickets - t.ticketsAbiertos} de {t.totalTickets} tickets resueltos o cerrados</p>
                </div>
                {t.ticketsUrgentes > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    ⚠️ <strong>{t.ticketsUrgentes}</strong> ticket{t.ticketsUrgentes > 1 ? 's' : ''} urgente{t.ticketsUrgentes > 1 ? 's' : ''} requiere{t.ticketsUrgentes === 1 ? '' : 'n'} atención
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
