'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const statusColors = {
  abierto: 'bg-blue-100 text-blue-700',
  en_gestion: 'bg-yellow-100 text-yellow-700',
  pendiente_info: 'bg-orange-100 text-orange-700',
  resuelto: 'bg-green-100 text-green-700',
  cerrado: 'bg-slate-100 text-slate-600',
}
const statusLabels = { abierto: 'Abierto', en_gestion: 'En Gestión', pendiente_info: 'Pendiente Info', resuelto: 'Resuelto', cerrado: 'Cerrado' }
const roleLabels = {
  admin_copropiedad: 'Administrador', presidente_consejo: 'Presidente Consejo',
  secretario_consejo: 'Secretario', vocal_consejo: 'Vocal',
  contador: 'Contador', tesorero: 'Tesorero', convivencia: 'Convivencia',
}

function calcDias(t) {
  const start = new Date(t.created_at)
  const end = t.closed_at ? new Date(t.closed_at) : t.resolved_at ? new Date(t.resolved_at) : new Date()
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
}
function diasColor(t) {
  if (['cerrado', 'resuelto'].includes(t.status)) {
    const end = new Date(t.closed_at || t.resolved_at)
    return end <= new Date(t.due_date) ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
  }
  return new Date() > new Date(t.due_date) ? 'text-red-600 font-semibold' : 'text-orange-500'
}

function TicketTable({ tickets, loading, isAdmin, onDelete, emptyMsg }) {
  if (loading) return <div className="p-6 text-center text-slate-400 text-sm">Cargando...</div>
  if (!tickets.length) return <div className="p-6 text-center text-slate-400 text-sm">{emptyMsg}</div>
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-600 text-left">
        <tr>
          <th className="px-4 py-3 font-medium">N° Ticket</th>
          <th className="px-4 py-3 font-medium">Título</th>
          <th className="px-4 py-3 font-medium">Tipo</th>
          <th className="px-4 py-3 font-medium">Solicitante</th>
          <th className="px-4 py-3 font-medium">Dirigido a</th>
          <th className="px-4 py-3 font-medium">Estado</th>
          <th className="px-4 py-3 font-medium">Días</th>
          <th className="px-4 py-3 font-medium">Acción</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {tickets.map(t => (
          <tr key={t.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.ticket_number}</td>
            <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{t.title}</td>
            <td className="px-4 py-3 text-slate-600">{t.ticket_types?.name || '-'}</td>
            <td className="px-4 py-3 text-slate-600">{t.profiles?.full_name || '-'}</td>
            <td className="px-4 py-3 text-slate-600">{t.assigned?.full_name || '-'}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded-full text-xs ${statusColors[t.status]}`}>{statusLabels[t.status]}</span>
            </td>
            <td className={`px-4 py-3 text-xs ${diasColor(t)}`}>
              {calcDias(t)}d{['cerrado','resuelto'].includes(t.status) ? '' : ' ▲'}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Link href={`/dashboard/tickets/${t.id}`} className="text-green-700 hover:underline text-xs">Ver</Link>
                {isAdmin && (
                  <button onClick={() => onDelete(t.id, t.ticket_number)} className="text-red-500 hover:text-red-700 text-xs">Borrar</button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PaginationBar({ page, total, limit, onPage }) {
  if (total <= limit) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-600 border-t border-slate-100">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}</span>
      <div className="flex gap-2">
        <button onClick={() => onPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 text-xs">← Ant</button>
        <span className="px-2 py-1 text-xs">Pág {page}/{Math.ceil(total / limit)}</span>
        <button onClick={() => onPage(p => p + 1)} disabled={page * limit >= total} className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 text-xs">Sig →</button>
      </div>
    </div>
  )
}

export default function TicketsPage() {
  const [user, setUser] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [asignables, setAsignables] = useState([])

  // Sección "Dirigidos a mí"
  const [miosTickets, setMiosTickets] = useState([])
  const [miosLoading, setMiosLoading] = useState(true)
  const [miosTotal, setMiosTotal] = useState(0)
  const [miosPage, setMiosPage] = useState(1)

  // Sección "Todos"
  const [allTickets, setAllTickets] = useState([])
  const [allLoading, setAllLoading] = useState(true)
  const [allTotal, setAllTotal] = useState(0)
  const [allPage, setAllPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')

  // Copropietario — vista simple
  const [myTickets, setMyTickets] = useState([])
  const [myLoading, setMyLoading] = useState(true)
  const [myTotal, setMyTotal] = useState(0)
  const [myPage, setMyPage] = useState(1)

  // Encuestas pendientes
  const [pendingSurveys, setPendingSurveys] = useState([])

  // Modal crear
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ticket_type_id: '', title: '', description: '', apartment: '', assigned_to: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [exporting, setExporting] = useState(false)

  const LIMIT = 20

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/parametros').then(r => r.json()),
      fetch('/api/usuarios/asignables').then(r => r.json()),
      fetch('/api/tickets?survey_pending=true').then(r => r.json()),
    ]).then(([me, params, asig, surveys]) => {
      setUser(me.user)
      setTicketTypes(params.data?.filter(t => t.is_active) || [])
      setAsignables(asig.data || [])
      setPendingSurveys(surveys.data || [])
    })
  }, [])

  const fetchMios = useCallback(async (p = 1) => {
    setMiosLoading(true)
    const res = await fetch(`/api/tickets?view=mios&page=${p}&limit=${LIMIT}`)
    const d = await res.json()
    setMiosTickets(d.data || [])
    setMiosTotal(d.total || 0)
    setMiosLoading(false)
  }, [])

  const fetchAll = useCallback(async (p = 1) => {
    setAllLoading(true)
    const params = new URLSearchParams({ view: 'all', page: p, limit: LIMIT })
    if (filterStatus) params.set('status', filterStatus)
    if (filterAssigned) params.set('assigned_filter', filterAssigned)
    const res = await fetch(`/api/tickets?${params}`)
    const d = await res.json()
    setAllTickets(d.data || [])
    setAllTotal(d.total || 0)
    setAllLoading(false)
  }, [filterStatus, filterAssigned])

  const fetchMy = useCallback(async (p = 1) => {
    setMyLoading(true)
    const res = await fetch(`/api/tickets?page=${p}&limit=${LIMIT}`)
    const d = await res.json()
    setMyTickets(d.data || [])
    setMyTotal(d.total || 0)
    setMyLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return
    if (user.role === 'copropietario') { fetchMy(myPage) }
    else { fetchMios(miosPage); fetchAll(allPage) }
  }, [user])

  useEffect(() => { if (user && user.role !== 'copropietario') fetchAll(1) }, [filterStatus, filterAssigned])
  useEffect(() => { if (user && user.role !== 'copropietario') fetchMios(miosPage) }, [miosPage])
  useEffect(() => { if (user && user.role !== 'copropietario') fetchAll(allPage) }, [allPage])
  useEffect(() => { if (user && user.role === 'copropietario') fetchMy(myPage) }, [myPage])

  const handleExport = async () => {
    setExporting(true)
    const view = isCopropietario ? '' : 'all'
    const res = await fetch(`/api/tickets?export=true&view=${view}`)
    const d = await res.json()
    const rows = (d.data || []).map(t => ({
      'N° Ticket': t.ticket_number,
      'Título': t.title,
      'Tipo': t.ticket_types?.name || '-',
      'Torre - Apto': t.apartment || '-',
      'Solicitante': t.profiles?.full_name || '-',
      'Dirigido a': t.assigned?.full_name || '-',
      'Estado': statusLabels[t.status] || t.status,
      'Días transcurridos': calcDias(t),
      'Fecha vencimiento': t.due_date || '-',
      'Fecha creación': new Date(t.created_at).toLocaleDateString('es-CO'),
      'Encuesta completada': t.survey_completed_at ? 'Sí' : 'No',
      'Satisfecho': t.survey_satisfied != null ? (t.survey_satisfied ? 'Sí' : 'No') : '-',
      'Calificación': t.survey_rating || '-',
    }))
    const XLSX = (await import('xlsx')).default
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets')
    XLSX.writeFile(wb, `tickets_${new Date().toISOString().split('T')[0]}.xlsx`)
    setExporting(false)
  }

  const handleCreate = async () => {
    if (pendingSurveys.length > 0) {
      setFormError(`Tiene ${pendingSurveys.length} encuesta(s) pendiente(s). Respóndalas antes de crear un nuevo ticket.`)
      return
    }
    if (!form.ticket_type_id || !form.title.trim() || !form.description.trim() || !form.apartment.trim() || !form.assigned_to) {
      setFormError('Todos los campos son obligatorios'); return
    }
    setSaving(true); setFormError('')
    const res = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setFormError(data.error || 'Error al crear ticket'); setSaving(false); return }
    setShowModal(false)
    setForm({ ticket_type_id: '', title: '', description: '', apartment: '', assigned_to: '' })
    if (user?.role === 'copropietario') fetchMy(1)
    else { fetchMios(1); fetchAll(1) }
    setSaving(false)
  }

  const handleDelete = async (id, num) => {
    if (!confirm(`¿Eliminar el ticket ${num}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' })
    if (res.ok) { fetchMios(miosPage); fetchAll(allPage) }
    else { const d = await res.json(); alert(d.error || 'Error al eliminar') }
  }

  const isAdmin = user?.role === 'admin_plataforma'
  const isCopropietario = user?.role === 'copropietario'
  const selectedType = ticketTypes.find(t => t.id === form.ticket_type_id)
  const selectedAsignado = asignables.find(a => a.id === form.assigned_to)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tickets</h1>
          <p className="text-slate-500 text-sm">Gestión de solicitudes y atención</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting} className="border border-green-700 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            {exporting ? 'Exportando...' : '⬇ Excel'}
          </button>
          <button
            onClick={() => { if (pendingSurveys.length > 0) { alert(`Tiene ${pendingSurveys.length} encuesta(s) de satisfacción pendiente(s). Respóndalas antes de crear un nuevo ticket.`); return } setShowModal(true) }}
            className="bg-orange-700 hover:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Nuevo Ticket
          </button>
        </div>
      </div>

      {/* Banner encuestas pendientes */}
      {pendingSurveys.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Tiene {pendingSurveys.length} encuesta(s) de satisfacción pendiente(s)</p>
            <p className="text-xs text-amber-700 mt-0.5">Debe responderlas antes de crear nuevos tickets.</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pendingSurveys.map(s => (
                <a key={s.id} href={`/dashboard/tickets/${s.id}`} className="text-xs bg-amber-100 border border-amber-300 text-amber-800 px-2 py-1 rounded hover:bg-amber-200">
                  {s.ticket_number} — {s.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vista copropietario — solo sus tickets */}
      {isCopropietario && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Mis Tickets</h2>
          </div>
          <TicketTable tickets={myTickets} loading={myLoading} isAdmin={false} onDelete={handleDelete} emptyMsg="No tienes tickets" />
          <PaginationBar page={myPage} total={myTotal} limit={LIMIT} onPage={setMyPage} />
        </div>
      )}

      {/* Vista staff — dos secciones */}
      {!isCopropietario && (
        <>
          {/* Sección 1: Dirigidos a mí */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-700">👤 Dirigidos a mí</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tickets asignados directamente a tu perfil</p>
              </div>
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full">{miosTotal}</span>
            </div>
            <TicketTable tickets={miosTickets} loading={miosLoading} isAdmin={isAdmin} onDelete={handleDelete} emptyMsg="No tienes tickets asignados" />
            <PaginationBar page={miosPage} total={miosTotal} limit={LIMIT} onPage={setMiosPage} />
          </div>

          {/* Sección 2: Todos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-700">📋 Todos los Tickets</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Vista general del sistema</p>
                </div>
                <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full">{allTotal}</span>
              </div>
              {/* Filtros */}
              <div className="flex gap-2 flex-wrap items-center">
                {['', 'abierto', 'en_gestion', 'pendiente_info', 'resuelto', 'cerrado'].map(s => (
                  <button key={s} onClick={() => { setFilterStatus(s); setAllPage(1) }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-green-800 text-white border-green-800' : 'bg-white text-slate-600 border-slate-300 hover:border-green-600'}`}>
                    {s === '' ? 'Todos' : statusLabels[s]}
                  </button>
                ))}
                {isAdmin && (
                  <select value={filterAssigned} onChange={e => { setFilterAssigned(e.target.value); setAllPage(1) }}
                    className="ml-auto border border-slate-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Todos los asignados</option>
                    {asignables.map(a => <option key={a.id} value={a.id}>{a.full_name} — {roleLabels[a.role] || a.role}</option>)}
                  </select>
                )}
              </div>
            </div>
            <TicketTable tickets={allTickets} loading={allLoading} isAdmin={isAdmin} onDelete={handleDelete} emptyMsg="No hay tickets" />
            <PaginationBar page={allPage} total={allTotal} limit={LIMIT} onPage={setAllPage} />
          </div>
        </>
      )}

      {/* Modal crear */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Nuevo Ticket</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de solicitud *</label>
                  <select value={form.ticket_type_id} onChange={e => setForm({...form, ticket_type_id: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Seleccionar...</option>
                    {ticketTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {selectedType?.response_days && (
                    <p className="text-xs text-green-700 mt-1.5 bg-green-50 border border-green-200 rounded px-2 py-1">
                      ⏱ Tiempo de respuesta: <strong>{selectedType.response_days} día{selectedType.response_days !== 1 ? 's' : ''}</strong> hábiles
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Torre - Apartamento *</label>
                  <input placeholder="Ej: 3-202" value={form.apartment} onChange={e => setForm({...form, apartment: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                  <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descripción *</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dirigido a *</label>
                  <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Seleccionar persona...</option>
                    {asignables.map(a => <option key={a.id} value={a.id}>{a.full_name} — {roleLabels[a.role] || a.role}</option>)}
                  </select>
                  {selectedAsignado && (
                    <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                      👤 <strong>{selectedAsignado.full_name}</strong> · {roleLabels[selectedAsignado.role] || selectedAsignado.role}
                    </p>
                  )}
                </div>
              </div>
              {formError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{formError}</div>}
            </div>
            <div className="flex gap-3 p-6 pt-4 border-t border-slate-100">
              <button onClick={() => { setShowModal(false); setFormError('') }} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 bg-orange-700 hover:bg-orange-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Creando...' : 'Crear Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
