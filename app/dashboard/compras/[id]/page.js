'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const statusLabels = {
  enviada: 'Enviada', aprobada_consejo: 'Aprobada', rechazada_consejo: 'Rechazada',
  compra_directa: 'Compra Directa', proveedor_definido: 'En Gestión',
  factura_recibida: 'Factura Recibida', factura_devuelta: 'Factura Devuelta',
  pagado: 'Pagado', retirada: 'Retirada', borrador: 'Borrador'
}

const statusColors = {
  enviada: 'bg-blue-100 text-blue-700', aprobada_consejo: 'bg-green-100 text-green-700',
  rechazada_consejo: 'bg-red-100 text-red-700', compra_directa: 'bg-amber-100 text-amber-700',
  proveedor_definido: 'bg-purple-100 text-purple-700', factura_recibida: 'bg-orange-100 text-orange-700',
  factura_devuelta: 'bg-red-100 text-red-600', pagado: 'bg-green-100 text-green-800',
  retirada: 'bg-slate-100 text-slate-500', borrador: 'bg-slate-100 text-slate-600'
}

export default function CompraDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [compra, setCompra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('')
  const [actionForm, setActionForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [showChoiceModal, setShowChoiceModal] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user))
    fetchCompra()
  }, [id])

  const fetchCompra = async () => {
    setLoading(true)
    const res = await fetch(`/api/compras/${id}`)
    const data = await res.json()
    setCompra(data.data)
    setLoading(false)
  }

  const updateCompra = async (updates) => {
    setSaving(true)
    const res = await fetch(`/api/compras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, notes })
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Error al actualizar'); setSaving(false); return }
    setShowActionModal(false)
    setShowChoiceModal(false)
    setNotes('')
    setActionForm({})
    setPendingApproval(null)
    fetchCompra()
    setSaving(false)
  }

  const openAction = (type) => { setActionType(type); setActionForm({}); setNotes(''); setShowActionModal(true) }

  const handleConfirmAction = () => {
    if (actionType === 'aprobar_consejo') {
      if (!actionForm.max_budget || !actionForm.accounting_account) {
        alert('Complete el monto presupuesto aprobado y la cuenta contable')
        return
      }
      if (actionForm.max_budget < 50000) {
        setPendingApproval({ ...actionForm })
        setShowActionModal(false)
        setShowChoiceModal(true)
        return
      }
      updateCompra({ status: 'aprobada_consejo', ...actionForm })
      return
    }

    const statusMap = {
      rechazar_consejo: 'rechazada_consejo',
      caracteristicas: 'proveedor_definido',
      factura: 'factura_recibida',
      devolver_factura: 'factura_devuelta',
      pago: 'pagado',
      retirar: 'retirada',
    }

    if (actionType === 'caracteristicas') {
      const { hasSupplier, ...rest } = actionForm
      updateCompra({ status: 'proveedor_definido', ...rest })
      return
    }

    updateCompra({ status: statusMap[actionType], ...actionForm })
  }

  const handleChoice = (choice) => {
    const status = choice === 'directa' ? 'compra_directa' : 'aprobada_consejo'
    updateCompra({ status, ...pendingApproval })
  }

  const isConsejo = user && ['presidente_consejo','secretario_consejo'].includes(user.role)
  const isGestion = user && ['secretario_consejo','vocal_consejo'].includes(user.role)
  const isTesoreria = user && ['tesorero','contador'].includes(user.role)
  const isAdmin = user && user.role === 'admin_plataforma'
  const esMiSolicitud = compra && user && compra.created_by === user.id

  const eliminarSolicitud = async () => {
    if (!confirm(`¿Eliminar definitivamente la solicitud ${compra.request_number}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/compras/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/compras')
    else { const d = await res.json(); alert(d.error || 'Error al eliminar') }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando...</div>
  if (!compra) return <div className="p-8 text-center text-slate-400">Solicitud no encontrada</div>

  const montoSolicitado = compra.estimated_total || 0
  const montoAprobado = compra.max_budget || 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-green-700 text-sm hover:underline">← Volver</button>
        {isAdmin && (
          <button onClick={eliminarSolicitud} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg">🗑 Eliminar solicitud</button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-mono text-slate-400">{compra.request_number}</span>
            <h1 className="text-xl font-bold text-slate-800 mt-1">{compra.title}</h1>
            <p className="text-sm text-slate-500">Categoría: {compra.category} · Solicitante: {compra.profiles?.full_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[compra.status] || 'bg-slate-100 text-slate-600'}`}>{statusLabels[compra.status]}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Descripción</p>
            <p className="text-sm text-slate-700">{compra.description}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Justificación</p>
            <p className="text-sm text-slate-700">{compra.justification}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Cantidad</p>
            <p className="font-bold text-slate-800">{compra.quantity} {compra.unit}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Valor Unit.</p>
            <p className="font-bold text-slate-800">${(compra.estimated_value || 0).toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Monto Solicitado</p>
            <p className="font-bold text-slate-800">${montoSolicitado.toLocaleString('es-CO')}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${montoAprobado ? 'bg-blue-50' : 'bg-slate-50'}`}>
            <p className="text-xs text-slate-500">Monto Presupuesto Aprobado</p>
            <p className="font-bold text-slate-800">{montoAprobado ? `$${montoAprobado.toLocaleString('es-CO')}` : '—'}</p>
          </div>
        </div>

        {compra.accounting_account && (
          <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
            <span className="text-slate-500">Cuenta Contable Aprobada: </span>
            <span className="font-medium">{compra.accounting_account}</span>
          </div>
        )}

        {(compra.purchase_characteristics || compra.supplier_definition || compra.purchase_requirements || compra.purchase_observations || compra.council_meeting_date) && (
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-purple-700 mb-2">Características de Compra</p>
            <div className="space-y-1.5 text-sm">
              {compra.purchase_characteristics && <p><strong>Características:</strong> {compra.purchase_characteristics}</p>}
              {compra.purchase_requirements && <p><strong>Requisitos:</strong> {compra.purchase_requirements}</p>}
              {compra.purchase_observations && <p><strong>Aclaraciones:</strong> {compra.purchase_observations}</p>}
              {compra.supplier_definition && <p><strong>Proveedor:</strong> {compra.supplier_definition}</p>}
              {compra.council_meeting_date && (
                <p><strong>Fecha reunión consejo:</strong> {new Date(compra.council_meeting_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              )}
              {compra.council_attendees?.length > 0 && (
                <div className="flex items-start gap-2">
                  <strong className="shrink-0">Asistentes:</strong>
                  <div className="flex flex-wrap gap-1">
                    {compra.council_attendees.map(a => (
                      <span key={a} className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">✓ {a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {compra.payment_amount && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-green-700 mb-2">Información de Pago</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span><strong>Monto:</strong> ${compra.payment_amount?.toLocaleString('es-CO')}</span>
              <span><strong>Referencia:</strong> {compra.payment_reference || '—'}</span>
              <span><strong>N° Autorización:</strong> {compra.payment_auth_number || '—'}</span>
              <span><strong>Fecha:</strong> {compra.payment_date || '—'}</span>
              <span><strong>Método:</strong> {compra.payment_method || '—'}</span>
              <span><strong>Banco:</strong> {compra.payment_bank || '—'}</span>
              {compra.invoice_file_url && (
                <span className="col-span-2"><strong>Factura: </strong><a href={compra.invoice_file_url} target="_blank" className="text-green-700 underline">Ver adjunto</a></span>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 flex-wrap mt-4">

          {/* Paso 2: Consejo aprueba/rechaza — solo si NO es su propia solicitud */}
          {isConsejo && compra.status === 'enviada' && !esMiSolicitud && (
            <>
              <button onClick={() => openAction('aprobar_consejo')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs">✓ Aprobar</button>
              <button onClick={() => openAction('rechazar_consejo')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs">✗ Rechazar</button>
            </>
          )}
          {isConsejo && compra.status === 'enviada' && esMiSolicitud && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">No puede aprobar su propia solicitud</span>
          )}

          {/* Paso 3: Secretario/Vocal definen características */}
          {isGestion && compra.status === 'aprobada_consejo' && (
            <button onClick={() => openAction('caracteristicas')} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs">📋 Definir Características</button>
          )}

          {/* Paso 4: Tesorería */}
          {isTesoreria && compra.status === 'proveedor_definido' && (
            <button onClick={() => openAction('factura')} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-xs">🧾 Registrar Factura</button>
          )}
          {isTesoreria && compra.status === 'factura_recibida' && (
            <>
              <button onClick={() => openAction('pago')} className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg text-xs">💳 Registrar Pago</button>
              <button onClick={() => openAction('devolver_factura')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs">↩ Devolver Factura</button>
            </>
          )}
          {isTesoreria && compra.status === 'factura_devuelta' && (
            <button onClick={() => openAction('factura')} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-xs">🔄 Resubir Factura Corregida</button>
          )}

          {/* Retirar: solo el creador mientras esté en enviada */}
          {esMiSolicitud && compra.status === 'enviada' && (
            <button onClick={() => openAction('retirar')} className="bg-slate-500 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs">↩ Retirar</button>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Historial</h2>
        <div className="space-y-2">
          {compra.purchase_history?.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(h => (
            <div key={h.id} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-600 mt-1.5 flex-shrink-0"></div>
              <div>
                <span className="font-medium text-slate-700">{h.profiles?.full_name}</span>
                <span className="text-slate-500"> → {statusLabels[h.to_status] || h.to_status}</span>
                {h.notes && <p className="text-slate-500 text-xs mt-0.5">{h.notes}</p>}
                <p className="text-slate-400 text-xs">{new Date(h.created_at).toLocaleString('es-CO')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de acción */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-6 overflow-y-auto flex-1">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {actionType === 'aprobar_consejo' && '✓ Aprobar Solicitud'}
              {actionType === 'rechazar_consejo' && '✗ Rechazar Solicitud'}
              {actionType === 'caracteristicas' && '📋 Definir Características'}
              {actionType === 'factura' && '🧾 Registrar Factura'}
              {actionType === 'devolver_factura' && '↩ Devolver Factura'}
              {actionType === 'pago' && '💳 Registrar Pago'}
              {actionType === 'retirar' && '↩ Retirar Solicitud'}
            </h2>

            <div className="space-y-3">

              {actionType === 'aprobar_consejo' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Monto presupuesto aprobado *</label>
                    <input type="number" placeholder="0" value={actionForm.max_budget || ''} onChange={e => setActionForm({...actionForm, max_budget: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {actionForm.max_budget > 0 && actionForm.max_budget < 50000 && (
                      <p className="text-xs text-amber-600 mt-1">⚠ Monto menor a $50,000 — se le preguntará el tipo de compra</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta Contable *</label>
                    <input placeholder="Ej: 5205" value={actionForm.accounting_account || ''} onChange={e => setActionForm({...actionForm, accounting_account: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                    <textarea placeholder="Observaciones de la aprobación..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </>
              )}

              {actionType === 'rechazar_consejo' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Motivo del rechazo *</label>
                  <textarea placeholder="Explique el motivo del rechazo..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              )}

              {actionType === 'caracteristicas' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Características del producto o servicio *</label>
                    <textarea value={actionForm.purchase_characteristics || ''} onChange={e => setActionForm({...actionForm, purchase_characteristics: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Requisitos</label>
                    <textarea value={actionForm.purchase_requirements || ''} onChange={e => setActionForm({...actionForm, purchase_requirements: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Aclaraciones</label>
                    <textarea value={actionForm.purchase_observations || ''} onChange={e => setActionForm({...actionForm, purchase_observations: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">¿Se define proveedor?</label>
                    <select value={actionForm.hasSupplier || ''} onChange={e => setActionForm({...actionForm, hasSupplier: e.target.value, supplier_definition: e.target.value === 'no' ? '' : actionForm.supplier_definition})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Seleccionar...</option>
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  {actionForm.hasSupplier === 'si' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Información del proveedor</label>
                      <textarea placeholder="Nombre, NIT, contacto, condiciones..." value={actionForm.supplier_definition || ''} onChange={e => setActionForm({...actionForm, supplier_definition: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha reunión de consejo donde se aprobó</label>
                    <input type="date" value={actionForm.council_meeting_date || ''} onChange={e => setActionForm({...actionForm, council_meeting_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">Asistentes</label>
                    <div className="space-y-2 pl-1">
                      {['Presidente', 'Secretario', 'Tesorero', 'Vocal 1', 'Vocal 2'].map(a => (
                        <label key={a} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={(actionForm.council_attendees || []).includes(a)}
                            onChange={e => {
                              const prev = actionForm.council_attendees || []
                              setActionForm({...actionForm, council_attendees: e.target.checked ? [...prev, a] : prev.filter(x => x !== a)})
                            }}
                            className="w-4 h-4 rounded accent-green-700"
                          />
                          <span className="text-slate-700">{a}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </>
              )}

              {actionType === 'factura' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">URL de la factura (adjunto)</label>
                    <input placeholder="https://drive.google.com/..." value={actionForm.invoice_file_url || ''} onChange={e => setActionForm({...actionForm, invoice_file_url: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </>
              )}

              {actionType === 'devolver_factura' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Motivo de la devolución *</label>
                  <textarea placeholder="Indique por qué se devuelve la factura..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              )}

              {actionType === 'pago' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Monto pagado *</label>
                    <input type="number" value={actionForm.payment_amount || ''} onChange={e => setActionForm({...actionForm, payment_amount: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de pago *</label>
                    <input type="date" value={actionForm.payment_date || ''} onChange={e => setActionForm({...actionForm, payment_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">N° Autorización *</label>
                    <input value={actionForm.payment_auth_number || ''} onChange={e => setActionForm({...actionForm, payment_auth_number: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Referencia</label>
                    <input value={actionForm.payment_reference || ''} onChange={e => setActionForm({...actionForm, payment_reference: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Método de pago</label>
                    <select value={actionForm.payment_method || ''} onChange={e => setActionForm({...actionForm, payment_method: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Seleccionar...</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Banco</label>
                    <input value={actionForm.payment_bank || ''} onChange={e => setActionForm({...actionForm, payment_bank: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta contable del pago</label>
                    <input value={actionForm.payment_accounting_account || ''} onChange={e => setActionForm({...actionForm, payment_accounting_account: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </>
              )}

              {actionType === 'retirar' && (
                <>
                  <p className="text-sm text-slate-500">¿Está seguro de que desea retirar esta solicitud? No podrá continuar su trámite.</p>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Motivo (opcional)</label>
                    <textarea placeholder="Indique el motivo del retiro..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  </div>
                </>
              )}
            </div>
            </div>

            <div className="flex gap-3 p-6 pt-4 border-t border-slate-100">
              <button onClick={() => setShowActionModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleConfirmAction} disabled={saving} className="flex-1 bg-orange-700 hover:bg-orange-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal elección compra directa / continuar flujo */}
      {showChoiceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-1">Monto menor a $50,000</h2>
            <p className="text-slate-500 text-sm mb-6">El monto presupuestado es inferior a $50.000. Seleccione cómo desea continuar:</p>
            <div className="space-y-3">
              <button onClick={() => handleChoice('continuar')} disabled={saving} className="w-full border-2 border-green-600 text-green-700 rounded-xl py-4 px-4 text-sm font-medium hover:bg-green-50 text-left">
                <div className="font-semibold">➡ Continuar flujo de compra</div>
                <div className="text-xs text-green-600 mt-0.5">Secretario/Vocal definen características y proveedor</div>
              </button>
              <button onClick={() => handleChoice('directa')} disabled={saving} className="w-full border-2 border-orange-500 text-orange-700 rounded-xl py-4 px-4 text-sm font-medium hover:bg-orange-50 text-left">
                <div className="font-semibold">🛒 Compra directa por solicitante</div>
                <div className="text-xs text-orange-600 mt-0.5">El solicitante realiza la compra directamente</div>
              </button>
            </div>
            <button onClick={() => { setShowChoiceModal(false); setShowActionModal(true) }} className="w-full mt-4 text-slate-400 text-xs hover:text-slate-600">← Volver al formulario</button>
          </div>
        </div>
      )}
    </div>
  )
}
