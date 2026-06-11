import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  try { return jwt.verify(token, process.env.JWT_SECRET) } catch { return null }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // All purchase requests visible to this user
  let query = supabaseAdmin
    .from('purchase_requests')
    .select('id, status, category, priority, estimated_total, payment_amount, created_at, created_by')

  if (user.role === 'copropietario') {
    query = query.eq('created_by', user.id)
  }

  const { data: compras, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tickets stats
  let ticketQuery = supabaseAdmin
    .from('tickets')
    .select('id, status, priority, created_at')
  if (user.role === 'copropietario') {
    ticketQuery = ticketQuery.eq('created_by', user.id)
  }
  const { data: tickets } = await ticketQuery

  // --- Compras KPIs ---
  const totalCompras = compras?.length || 0
  const montoTotal = compras?.reduce((s, c) => s + (c.estimated_total || 0), 0) || 0
  const montoPagado = compras?.reduce((s, c) => s + (c.payment_amount || 0), 0) || 0
  const aprobadas = compras?.filter(c => ['aprobada_consejo','proveedor_definido','pedido_realizado','factura_recibida','pagado'].includes(c.status)).length || 0
  const pagadas = compras?.filter(c => c.status === 'pagado').length || 0
  const pendientes = compras?.filter(c => ['enviada','en_analisis'].includes(c.status)).length || 0

  // Por estado
  const statusOrder = ['enviada','en_analisis','aprobada_consejo','rechazada_consejo','proveedor_definido','pedido_realizado','factura_recibida','factura_devuelta','pagado']
  const statusLabels = {
    enviada: 'Enviada', en_analisis: 'En Análisis', aprobada_consejo: 'Aprobada',
    rechazada_consejo: 'Rechazada', proveedor_definido: 'Proveedor Def.',
    pedido_realizado: 'Pedido', factura_recibida: 'Factura', factura_devuelta: 'F. Devuelta', pagado: 'Pagado'
  }
  const porEstado = statusOrder.map(s => ({
    estado: statusLabels[s],
    cantidad: compras?.filter(c => c.status === s).length || 0,
  })).filter(s => s.cantidad > 0)

  // Por categoría
  const catMap = {}
  compras?.forEach(c => { if (c.category) catMap[c.category] = (catMap[c.category] || 0) + 1 })
  const porCategoria = Object.entries(catMap)
    .map(([cat, qty]) => ({ categoria: cat, cantidad: qty }))
    .sort((a, b) => b.cantidad - a.cantidad)

  // Por prioridad
  const prioMap = {}
  compras?.forEach(c => { if (c.priority) prioMap[c.priority] = (prioMap[c.priority] || 0) + 1 })
  const porPrioridad = Object.entries(prioMap).map(([p, c]) => ({ prioridad: p, cantidad: c }))

  // Tendencia mensual (últimos 6 meses)
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('es-CO', { month: 'short', year: '2-digit' }) }
  })
  const tendencia = months.map(({ year, month, label }) => ({
    mes: label,
    solicitudes: compras?.filter(c => {
      const d = new Date(c.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    }).length || 0,
    monto: compras?.filter(c => {
      const d = new Date(c.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    }).reduce((s, c) => s + (c.estimated_total || 0), 0) || 0,
  }))

  // --- Tickets KPIs ---
  const totalTickets = tickets?.length || 0
  const ticketsAbiertos = tickets?.filter(t => ['abierto','en_gestion','pendiente_info'].includes(t.status)).length || 0
  const ticketsUrgentes = tickets?.filter(t => t.priority === 'urgente').length || 0

  const ticketPorEstado = [
    { estado: 'Abierto', cantidad: tickets?.filter(t => t.status === 'abierto').length || 0 },
    { estado: 'En Gestión', cantidad: tickets?.filter(t => t.status === 'en_gestion').length || 0 },
    { estado: 'Pendiente', cantidad: tickets?.filter(t => t.status === 'pendiente_info').length || 0 },
    { estado: 'Resuelto', cantidad: tickets?.filter(t => t.status === 'resuelto').length || 0 },
    { estado: 'Cerrado', cantidad: tickets?.filter(t => t.status === 'cerrado').length || 0 },
  ].filter(s => s.cantidad > 0)

  return NextResponse.json({
    compras: { totalCompras, montoTotal, montoPagado, aprobadas, pagadas, pendientes, porEstado, porCategoria, porPrioridad, tendencia },
    tickets: { totalTickets, ticketsAbiertos, ticketsUrgentes, ticketPorEstado },
  })
}
