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
  const [survey, setSurvey] = useState({ satisfied: null, rating: null, observations: '' })
  const [surveyError, setSurveyError] = useState('')
  const [sendingSurvey, setSendingSurvey] = useState(false)
  const [asignables, setAsignables] = useState([])
  const [newAssignee, setNewAssignee] = useState('')
  const [reasigning, setReasigning] = useState(false)
  const [reasignError, setReasignError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user)
      if (d.user?.role === 'admin_plataforma') {
        fetch('/api/usuarios/asignables').then(r => r.json()).then(a => setAsignables(a.data || []))
      }
    })
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
  const isAdmin = user?.role === 'admin_plataforma'
  const isAsignado = ticket && user && ticket.assigned_to === user.id
  const puedeGestionar = isAdmin || isAsignado
  const esMiTicket = ticket && user && ticket.created_by === user.id
  const puedeEncuesta = esMiTicket && ['resuelto','cerrado'].includes(ticket?.status) && !ticket?.survey_completed_at

  const handleReasign = async () => {
    if (!newAssignee) { setReasignError('Seleccione una persona'); return }
    setReasigning(true); setReasignError('')
    const res = await fetch(`/api/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: newAssignee })
    })
    const data = await res.json()
    if (!res.ok) { setReasignError(data.error || 'Error al reasignar'); setReasigning(false); return }
    setNewAssignee('')
    setReasigning(false)
    fetchTicket()
  }

  const handleSurvey = async () => {
    if (survey.satisfied === null) { setSurveyError('Indique si está satisfecho'); return }
    if (!survey.rating) { setSurveyError('Seleccione una calificación del 1 al 5'); return }
    setSendingSurvey(true); setSurveyError('')
    const res = await fetch(`/api/tickets/${id}/encuesta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ survey_satisfied: survey.satisfied, survey_rating: survey.rating, survey_observations: survey.observations })
    })
    const data = await res.json()
    if (!res.ok) { setSurveyError(data.error || 'Error al enviar'); setSendingSurvey(false); return }
    setSendingSurvey(false)
    fetchTicket()
  }

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

        <div className="flex gap-4 mt-4 text-xs text-slate-500 flex-wrap">
          <span>Solicitante: <strong>{ticket.profiles?.full_name}</strong></span>
          <span>Torre - Apto: <strong>{ticket.apartment || '-'}</strong></span>
          <span>Dirigido a: <strong className="text-green-700">{ticket.assigned?.full_name || '-'}</strong></span>
          <span>Vence: <strong>{ticket.due_date || '-'}</strong></span>
          <span>Creado: <strong>{new Date(ticket.created_at).toLocaleDateString('es-CO')}</strong></span>
        </div>

        {!isCopropietario && ticket.status !== 'cerrado' && (
          puedeGestionar ? (
            <div className="flex gap-2 mt-4 flex-wrap">
              {ticket.status === 'abierto' && <button onClick={() => updateStatus('en_gestion')} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs">Tomar en gestión</button>}
              {ticket.status === 'en_gestion' && <button onClick={() => updateStatus('pendiente_info')} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs">Solicitar información</button>}
              {['en_gestion','pendiente_info'].includes(ticket.status) && <button onClick={() => updateStatus('resuelto')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">Marcar resuelto</button>}
              {ticket.status === 'resuelto' && <button onClick={() => updateStatus('cerrado')} className="bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs">Cerrar ticket</button>}
            </div>
          ) : (
            <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Este ticket está asignado a <strong>{ticket.assigned?.full_name}</strong>. Solo esa persona puede gestionarlo.
            </p>
          )
        )}
      </div>

      {/* Reasignación — solo admin_plataforma */}
      {isAdmin && ticket.status !== 'cerrado' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Reasignar Ticket</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Asignado actualmente: <strong>{ticket.assigned?.full_name || '-'}</strong></label>
              <select
                value={newAssignee}
                onChange={e => { setNewAssignee(e.target.value); setReasignError('') }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Seleccionar nuevo responsable...</option>
                {asignables.filter(a => a.id !== ticket.assigned_to).map(a => (
                  <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleReasign}
              disabled={reasigning || !newAssignee}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 whitespace-nowrap"
            >
              {reasigning ? 'Reasignando...' : 'Reasignar'}
            </button>
          </div>
          {reasignError && <p className="text-red-600 text-xs mt-2">{reasignError}</p>}
        </div>
      )}

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

        {/* Encuesta de satisfacción completada — visible para todos */}
        {ticket.survey_completed_at && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-green-800 mb-2">✓ Encuesta de satisfacción respondida</p>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <span>¿Satisfecho?: <strong>{ticket.survey_satisfied ? 'Sí' : 'No'}</strong></span>
              <span>Calificación: <strong>{'★'.repeat(ticket.survey_rating || 0)}{'☆'.repeat(5 - (ticket.survey_rating || 0))} ({ticket.survey_rating}/5)</strong></span>
              {ticket.survey_observations && <span className="col-span-2">Observaciones: <em>{ticket.survey_observations}</em></span>}
            </div>
          </div>
        )}

        {ticket.status !== 'cerrado' && (isCopropietario || puedeGestionar) && (
          <div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-2"
            />
            <div className="flex items-center justify-between">
              {puedeGestionar && !isCopropietario && (
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

      {/* Encuesta de satisfacción pendiente */}
      {puedeEncuesta && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-orange-300 p-6 mt-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Encuesta de satisfacción</h2>
              <p className="text-xs text-slate-500">Su ticket fue resuelto. Por favor califique la atención recibida.</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Pregunta 1 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">1. ¿Está satisfecho con la respuesta?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSurvey(s => ({...s, satisfied: true}))}
                  className={`px-5 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${survey.satisfied === true ? 'bg-green-600 border-green-600 text-white' : 'border-slate-300 text-slate-600 hover:border-green-400'}`}
                >
                  👍 Sí
                </button>
                <button
                  onClick={() => setSurvey(s => ({...s, satisfied: false}))}
                  className={`px-5 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${survey.satisfied === false ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 text-slate-600 hover:border-red-400'}`}
                >
                  👎 No
                </button>
              </div>
            </div>

            {/* Pregunta 2 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">2. Califique de 1 a 5 la atención recibida</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setSurvey(s => ({...s, rating: n}))}
                    className={`w-11 h-11 rounded-lg text-lg font-bold border-2 transition-colors ${survey.rating === n ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-500'}`}
                  >
                    {n}
                  </button>
                ))}
                {survey.rating && (
                  <span className="ml-2 text-2xl self-center">
                    {'★'.repeat(survey.rating)}{'☆'.repeat(5 - survey.rating)}
                  </span>
                )}
              </div>
            </div>

            {/* Pregunta 3 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">3. Deje sus observaciones sobre la atención recibida</p>
              <textarea
                value={survey.observations}
                onChange={e => setSurvey(s => ({...s, observations: e.target.value}))}
                placeholder="Opcional — cuéntenos su experiencia..."
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {surveyError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{surveyError}</div>}

          <button
            onClick={handleSurvey}
            disabled={sendingSurvey}
            className="mt-4 w-full bg-orange-700 hover:bg-orange-800 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {sendingSurvey ? 'Enviando...' : 'Enviar encuesta'}
          </button>
        </div>
      )}
    </div>
  )
}
