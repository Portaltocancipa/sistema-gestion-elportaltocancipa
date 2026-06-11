'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const statusLabels = { abierto: 'Abierto', en_gestion: 'En Gestión', pendiente_info: 'Pendiente Info', resuelto: 'Resuelto', cerrado: 'Cerrado' }
const statusColors = { abierto: 'bg-blue-100 text-blue-700', en_gestion: 'bg-yellow-100 text-yellow-700', pendiente_info: 'bg-orange-100 text-orange-700', resuelto: 'bg-green-100 text-green-700', cerrado: 'bg-slate-100 text-slate-600' }

export default function TicketDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState(null)
  const [isInternal, setIsInternal] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    fetchTicket()
  }, [id])

  const fetchTicket = async () => {
    setLoading(true)
    const res = await fetch(`/api/tickets/${id}`)
    const data = await res.json()
    setTicket(data.data)
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!message.trim()) return
    setSending(true)
    await fetch(`/api/tickets/${id}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, is_internal: isInternal })
    })
    setMessage('')
    setIsInternal(false)
    fetchTicket()
    setSending(false)
  }

  const updateStatus = async (status) => {
    await fetch(`/api/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    fetchTicket()
  }

  const isCopropietario = user?.role === 'copropietario'

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando...</div>
  if (!ticket) return <div className="p-8 text-center text-slate-400">Ticket no encontrado</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="text-green-700 text-sm mb-4 hover:underline">← Volver</button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-mono text-slate-400">{ticket.ticket_number}</span>
            <h1 className="text-xl font-bold text-slate-800 mt-1">{ticket.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{ticket.ticket_types?.name} · Apto {ticket.apartment || '-'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>{statusLabels[ticket.status]}</span>
        </div>

        <p className="text-slate-700 text-sm bg-slate-50 rounded-lg p-4">{ticket.description}</p>

        <div className="flex gap-4 mt-4 text-xs text-slate-500">
          <span>Solicitante: <strong>{ticket.profiles?.full_name}</strong></span>
          <span>Vence: <strong>{ticket.due_date || '-'}</strong></span>
          <span>Creado: <strong>{new Date(ticket.created_at).toLocaleDateString('es-CO')}</strong></span>
        </div>

        {!isCopropietario && ticket.status !== 'cerrado' && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {ticket.status === 'abierto' && <button onClick={() => updateStatus('en_gestion')} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs">Tomar en gestión</button>}
            {ticket.status === 'en_gestion' && <button onClick={() => updateStatus('pendiente_info')} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs">Solicitar información</button>}
            {['en_gestion','pendiente_info'].includes(ticket.status) && <button onClick={() => updateStatus('resuelto')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">Marcar resuelto</button>}
            {ticket.status === 'resuelto' && <button onClick={() => updateStatus('cerrado')} className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs">Cerrar ticket</button>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Hilo de mensajes</h2>

        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
          {ticket.ticket_messages?.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Sin mensajes aún</p>}
          {ticket.ticket_messages?.map(m => (
            <div key={m.id} className={`rounded-lg p-3 text-sm ${m.is_internal ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-700">{m.profiles?.full_name}</span>
                {m.is_internal && <span className="text-xs bg-yellow-200 text-yellow-700 px-1.5 py-0.5 rounded">Interno</span>}
                <span className="text-xs text-slate-400 ml-auto">{new Date(m.created_at).toLocaleString('es-CO')}</span>
              </div>
              <p className="text-slate-600">{m.message}</p>
            </div>
          ))}
        </div>

        {ticket.status !== 'cerrado' && (
          <div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
            />
            <div className="flex items-center justify-between">
              {!isCopropietario && (
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                  Nota interna (no visible para copropietario)
                </label>
              )}
              <button onClick={sendMessage} disabled={sending || !message.trim()} className="ml-auto bg-orange-700 hover:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60">
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
