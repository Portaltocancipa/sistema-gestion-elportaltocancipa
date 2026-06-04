'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const statusLabels = {
  borrador: 'Borrador', enviada: 'Enviada', aprobada_consejo: 'Aprobada por Consejo',
  rechazada_consejo: 'Rechazada por Consejo', en_analisis: 'En Análisis',
  proveedor_definido: 'Proveedor Definido', pedido_realizado: 'Pedido Realizado',
  factura_recibida: 'Factura Recibida', factura_devuelta: 'Factura Devuelta', pagado: 'Pagado'
}

const statusColors = {
  borrador: 'bg-slate-100 text-slate-600', enviada: 'bg-blue-100 text-blue-700',
  aprobada_consejo: 'bg-green-100 text-green-700', rechazada_consejo: 'bg-red-100 text-red-700',
  en_analisis: 'bg-yellow-100 text-yellow-700', proveedor_definido: 'bg-purple-100 text-purple-700',
  pedido_realizado: 'bg-indigo-100 text-indigo-700', factura_recibida: 'bg-orange-100 text-orange-700',
  factura_devuelta: 'bg-red-100 text-red-600', pagado: 'bg-green-100 text-green-800'
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
    await fetch(`/api/compras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, notes })
    })
    setShowActionModal(false)
    setNotes('')
    setActionForm({})
    fetchCompra()
    setSaving(false)
  }

  const openAction = (type) => { setActionType(type); setActionForm({}); setNotes(''); setShowActionModal(true) }

  const isConsejo = user && ['presidente_consejo','secretario_consejo','admin_plataforma','admin_copropiedad'].includes(user.role)
  const isCompras = user && ['admin_plataforma','admin_copropiedad','contador','tesorero','vocal_consejo','presidente_consejo','secretario_consejo'].includes(user.role)
  const isTesoreria = user && ['tesorero','admin_plataforma'].includes(user.role)

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando...</div>
  if (!compra) return <div className="p-8 text-center text-slate-400">Solicitud no encontrada</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="text-blue-600 text-sm mb-4 hover:underline">← Volver</button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-mono text-slate-400">{compra.request_number}</span>
            <h1 className="text-xl font-bold text-slate-800 mt-1">{compra.title}</h1>
            <p className="text-sm text-slate-500">Categoría: {compra.category} · Prioridad: {compra.priority}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[compra.status]}`}>{statusLabels[compra.status]}</span>
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
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Cantidad</p>
            <p className="font-bold text-slate-800">{compra.quantity} {compra.unit}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Valor Unit.</p>
            <p className="font-bold text-slate-800">${(compra.estimated_value || 0).toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Total Est.</p>
            <p className="font-bold text-slate-800">${(compra.estimated_total || 0).toLocaleString('es-CO')}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-500">Presupuesto Máx.</p>
            <p className="font-bold text-slate-800">{compra.max_budget ? `$${compra.max_budget.toLocaleString('es-CO')}` : '-'}</p>
          </div>
        </div>

        {compra.accounting_account && (
          <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
            <span className="text-slate-500">Cuenta Contable: </span>
            <span className="font-medium">{compra.accounting_account}</span>
          </div>
        )}

        {(compra.purchase_characteristics || compra.supplier_definition) && (
          <div className="bg-purple-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-purple-700 mb-2">Información de Compras</p>
            <div className="space-y-2 text-sm">
              {compra.council_approval_date && <p><strong>Fecha aprobación consejo:</strong> {compra.council_approval_date}</p>}
              {compra.purchase_characteristics && <p><strong>Características:</strong> {compra.purchase_characteristics}</p>}
              {compra.purchase_requirements && <p><strong>Requisitos:</strong> {compra.purchase_requirements}</p>}
              {compra.purchase_observations && <p><strong>Observaciones:</strong> {compra.purchase_observations}</p>}
              {compra.supplier_definition && <p><strong>Definición proveedor:</strong> {compra.supplier_definition}</p>}
            </div>
          </div>
        )}

        {compra.payment_amount && (
          <div className="bg-green-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-green-700 mb-2">Información de Pago</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span><strong>Monto:</strong> ${compra.payment_amount?.toLocaleString('es-CO')}</span>
              <span><strong>Referencia:</strong> {compra.payment_reference}</span>
              <span><strong>N° Autorización:</strong> {compra.payment_auth_number || '-'}</span>
              <span><strong>Fecha:</strong> {compra.payment_date || '-'}</span>
              <span><strong>Método:</strong> {compra.payment_method || '-'}</span>
              <span><strong>Banco:</strong> {compra.payment_bank || '-'}</span>
              <span className="col-span-2"><strong>Cuenta contable pago:</strong> {compra.payment_accounting_account || '-'}</span>
              {compra.invoice_file_url && (
                <span className="col-span-2">
                  <strong>Factura: </strong>
                  <a href={compra.invoice_file_url} target="_blank" className="text-blue-600 underline">Ver adjunto</a>
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap mt-4">
          {isConsejo && compra.status === 'enviada' && (
            <>
              <button onClick={() => openAction('aprobar_consejo')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">✓ Aprobar</button>
              <button onClick={() => openAction('rechazar_consejo')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs">✗ Rechazar</button>
            </>
          )}
          {isCompras && compra.status === 'aprobada_consejo' && (
            <button onClick={() => openAction('compras')} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs">📋 Gestionar Compras</button>
          )}
          {isTesoreria && compra.status === 'pedido_realizado' && (
            <button onClick={() => openAction('pago')} className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs">💳 Registrar Pago</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Historial</h2>
        <div className="space-y-2">
          {compra.purchase_history?.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(h => (
            <div key={h.id} className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
              <div>
                <span className="font-medium text-slate-700">{h.profiles?.full_name}</span>
                <span className="text-slate-500"> → {statusLabels[h.to_status]}</span>
                {h.notes && <p className="text-slate-500 text-xs mt-0.5">{h.notes}</p>}
                <p className="text-slate-400 text-xs">{new Date(h.created_at).toLocaleString('es-CO')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showActionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {actionType === 'aprobar_consejo' && '✓ Aprobar Solicitud'}
              {actionType === 'rechazar_consejo' && '✗ Rechazar Solicitud'}
              {actionType === 'compras' && '📋 Gestionar Compras'}
              {actionType === 'pago' && '💳 Registrar Pago'}
            </h2>

            <div className="space-y-3">
              {actionType === 'aprobar_consejo' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta Contable *</label>
                    <input placeholder="Ej: 5205" value={actionForm.accounting_account || ''} onChange={e => setActionForm({...actionForm, accounting_account: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Presupuesto Máximo *</label>
                    <input type="number" placeholder="0" value={actionForm.max_budget || ''} onChange={e => setActionForm({...actionForm, max_budget: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              {actionType === 'rechazar_consejo' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Motivo del rechazo *</label>
                  <textarea placeholder="Explique el motivo del rechazo..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              {actionType === 'compras' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha aprobación Consejo</label>
                    <input type="date" value={actionForm.council_approval_date || ''} onChange={e => setActionForm({...actionForm, council_approval_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Características de la compra</label>
                    <textarea value={actionForm.purchase_characteristics || ''} onChange={e => setActionForm({...actionForm, purchase_characteristics: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Requisitos</label>
                    <textarea value={actionForm.purchase_requirements || ''} onChange={e => setActionForm({...actionForm, purchase_requirements: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                    <textarea value={actionForm.purchase_observations || ''} onChange={e => setActionForm({...actionForm, purchase_observations: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Definición del proveedor</label>
                    <textarea placeholder="Nombre, NIT, contacto, condiciones..." value={actionForm.supplier_definition || ''} onChange={e => setActionForm({...actionForm, supplier_definition: e.target.value})} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              {actionType === 'pago' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">¿Llegó la factura?</label>
                    <select value={actionForm.invoice_received || ''} onChange={e => setActionForm({...actionForm, invoice_received: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccionar...</option>
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Monto pagado *</label>
                    <input type="number" value={actionForm.payment_amount || ''} onChange={e => setActionForm({...actionForm, payment_amount: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de pago *</label>
                    <input type="date" value={actionForm.payment_date || ''} onChange={e => setActionForm({...actionForm, payment_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">N° Autorización de pago *</label>
                    <input value={actionForm.payment_auth_number || ''} onChange={e => setActionForm({...actionForm, payment_auth_number: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Referencia de pago</label>
                    <input value={actionForm.payment_reference || ''} onChange={e => setActionForm({...actionForm, payment_reference: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Método de pago</label>
                    <select value={actionForm.payment_method || ''} onChange={e => setActionForm({...actionForm, payment_method: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccionar...</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Banco</label>
                    <input value={actionForm.payment_bank || ''} onChange={e => setActionForm({...actionForm, payment_bank: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta contable del pago</label>
                    <input value={actionForm.payment_accounting_account || ''} onChange={e => setActionForm({...actionForm, payment_accounting_account: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">URL Factura (adjunto)</label>
                    <input placeholder="https://..." value={actionForm.invoice_file_url || ''} onChange={e => setActionForm({...actionForm, invoice_file_url: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              {actionType !== 'rechazar_consejo' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowActionModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={() => {
                const statusMap = {
                  aprobar_consejo: 'aprobada_consejo',
                  rechazar_consejo: 'rechazada_consejo',
                  compras: 'pedido_realizado',
                  pago: 'pagado'
                }
                updateCompra({ status: statusMap[actionType], ...actionForm })
              }} disabled={saving} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
