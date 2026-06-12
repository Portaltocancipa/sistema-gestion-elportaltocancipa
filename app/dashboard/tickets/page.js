'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const statusColors = {
  abierto: 'bg-blue-100 text-blue-700',
  en_gestion: 'bg-yellow-100 text-yellow-700',
  pendiente_info: 'bg-orange-100 text-orange-700',
  resuelto: 'bg-green-100 text-green-700',
  cerrado: 'bg-slate-100 text-slate-600',
}

const statusLabels = {
  abierto: 'Abierto',
  en_gestion: 'En Gestión',
  pendiente_info: 'Pendiente Info',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

const priorityColors = {
  baja: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  alta: 'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-600',
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [ticketTypes, setTicketTypes] = useState([])
  const [asignables, setAsignables] = useState([])
  const [form, setForm] = useState({ ticket_type_id: '', title: '', description: '', apartment: '', assigned_to: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [user, setUser] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const roleLabels = {
    admin_copropiedad: 'Administrador',
    presidente_consejo: 'Presidente Consejo',
    secretario_consejo: 'Secretario',
    vocal_consejo: 'Vocal',
    contador: 'Contador',
    tesorero: 'Tesorero',
    convivencia: 'Convivencia',
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    fetch('/api/parametros').then(r => r.json()).then(d => setTicketTypes(d.data?.filter(t => t.is_active) || []))
    fetch('/api/usuarios/asignables').then(r => r.json()).then(d => setAsignables(d.data || []))
  }, [])

  useEffect(() => { fetchTickets(page) }, [page])

  const fetchTickets = async (p = 1) => {
    setLoading(true)
    const res = await fetch(`/api/tickets?page=${p}&limit=${limit}`)
    const data = await res.json()
    setTickets(data.data || [])
    setTotal(data.total || 0)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.ticket_type_id || !form.title.trim() || !form.description.trim() || !form.apartment.trim() || !form.assigned_to) {
      setError('Todos los campos son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al crear ticket'); setSaving(false); return }
    setShowModal(false)
    setForm({ ticket_type_id: '', title: '', description: '', apartment: '', assigned_to: '' })
    fetchTickets(page)
    setSaving(false)
  }

  const selectedType = ticketTypes.find(t => t.id === form.ticket_type_id)
  const selectedAsignado = asignables.find(a => a.id === form.assigned_to)

  const filtered = filterStatus ? tickets.filter(t => t.status === filterStatus) : tickets

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tickets</h1>
          <p className="text-slate-500 text-sm">Gestión de solicitudes y atención</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-orange-700 hover:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nuevo Ticket
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'abierto', 'en_gestion', 'pendiente_info', 'resuelto', 'cerrado'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-green-800 text-white border-green-800' : 'bg-white text-slate-600 border-slate-300 hover:border-green-600'}`}>
            {s === '' ? 'Todos' : statusLabels[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">N° Ticket</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Dirigido a</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Vence</th>
                <th className="px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.ticket_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{t.title}</td>
                  <td className="px-4 py-3 text-slate-600">{t.ticket_types?.name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{t.profiles?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{t.assigned?.full_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[t.status]}`}>{statusLabels[t.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{t.due_date || '-'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tickets/${t.id}`} className="text-green-700 hover:underline text-xs">Ver</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No hay tickets</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50">← Anterior</button>
            <span className="px-3 py-1.5">Página {page} de {Math.ceil(total / limit)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50">Siguiente →</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
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
                  {asignables.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name} — {roleLabels[a.role] || a.role}</option>
                  ))}
                </select>
                {selectedAsignado && (
                  <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1">
                    👤 <strong>{selectedAsignado.full_name}</strong> · {roleLabels[selectedAsignado.role] || selectedAsignado.role}
                  </p>
                )}
              </div>
            </div>
            {error && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
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
