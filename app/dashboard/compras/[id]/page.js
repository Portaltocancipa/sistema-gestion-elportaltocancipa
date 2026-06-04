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
  const isCompras = user && ['admin_plataforma','admin_copropiedad','contador'].includes(user.role)
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
            <p className="text-xs text-slate-500">Cuenta Contable</p>
            <p className="font-bold text-slate-800">{compra.accounting_account || '-'}</p>
          </div>
        </div>

        {compra.supplier_name && (
          <div className="bg-purple-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-purple-700 mb-2">Proveedor</p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span><strong>Nombre:</strong> {compra.supplier_name}</span>
              <span><strong>NIT:</strong> {compra.supplier_nit || '-'}</span>
              <span><strong>Tel:</strong> {compra.supplier_phone || '-'}</span>
            </div>
          </div>
        )}

        {compra.payment_amount && (
          <div className="bg-green-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-green-700 mb-2">Información de Pago</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span><strong>Monto:</strong> ${compra.payment_amount?.toLocaleString('es-CO')}</span>
              <span><strong>Referencia:</strong> {compra.payment_reference}</span>
              <span><strong>Banco:</strong> {compra.payment_bank || '-'}</span>
              <span><strong>Método:</strong> {compra.payment_method}</span>
              <span className="col-span-2"><strong>Descripción:</strong> {compra.payment_description}</span>
              <span className="col-span-2"><strong>Cuenta contable pago:</strong> {compra.payment_accounting_account || '-'}</span>
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
            <button onClick={() => openAction('en_analisis')} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs">Iniciar análisis</button>
          )}
          {isCompras && compra.status === 'en_analisis' && (
            <button onClick={() => openAction('proveedor')} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs">Definir proveedor</button>
          )}
          {isCompras && compra.status === 'proveedor_definido' && (
            <button onClick={() => updateCompra({ status: 'pedido_realizado' })} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs">Marcar pedido realizado</button>
          )}
          {isTesoreria && compra.status === 'pedido_realizado' && (
            <>
              <button onClick={() => openAction('aprobar_factura')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">✓ Aprobar factura</button>
              <button onClick={() => openAction('devolver_factura')} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs">✗ Devolver factura</button>
            </>
          )}
          {isTesoreria && compra.status === 'factura_recibida' && (
            <button onClick={() => openAction('pago')} className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs">💳 Registrar pago</button>
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
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {actionType === 'aprobar_consejo' && 'Aprobar solicitud'}
              {actionType === 'rechazar_consejo' && 'Rechazar solicitud'}
              {actionType === 'en_analisis' && 'Iniciar análisis'}
              {actionType === 'proveedor' && 'Definir proveedor'}
              {actionType === 'aprobar_factura' && 'Aprobar factura'}
              {actionType === 'devolver_factura' && 'Devolver factura'}
              {actionType === 'pago' && 'Registrar pago'}
            </h2>

            <div className="space-y-3">
              {actionType === 'proveedor' && (
                <>
                  <input placeholder="Nombre proveedor *" value={actionForm.supplier_name || ''} onChange={e => setActionForm({...actionForm, supplier_name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="NIT" value={actionForm.supplier_nit || ''} onChange={e => setActionForm({...actionForm, supplier_nit: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Contacto" value={actionForm.supplier_contact || ''} onChange={e => setActionForm({...actionForm, supplier_contact: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Teléfono" value={actionForm.supplier_phone || ''} onChange={e => setActionForm({...actionForm, supplier_phone: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Email" value={actionForm.supplier_email || ''} onChange={e => setActionForm({...actionForm, supplier_email: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </>
              )}
              {actionType === 'aprobar_factura' && (
                <>
                  <input placeholder="N° Factura *" value={actionForm.invoice_number || ''} onChange={e => setActionForm({...actionForm, invoice_number: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" value={actionForm.invoice_date || ''} onChange={e => setActionForm({...actionForm, invoice_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" placeholder="Valor factura *" value={actionForm.invoice_value || ''} onChange={e => setActionForm({...actionForm, invoice_value: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </>
              )}
              {actionType === 'pago' && (
                <>
                  <input type="number" placeholder="Monto pagado *" value={actionForm.payment_amount || ''} onChange={e => setActionForm({...actionForm, payment_amount: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Referencia de pago *" value={actionForm.payment_reference || ''} onChange={e => setActionForm({...actionForm, payment_reference: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Descripción" value={actionForm.payment_description || ''} onChange={e => setActionForm({...actionForm, payment_description: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Cuenta contable" value={actionForm.payment_accounting_account || ''} onChange={e => setActionForm({...actionForm, payment_accounting_account: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <select value={actionForm.payment_method || ''} onChange={e => setActionForm({...actionForm, payment_method: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Método de pago *</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                  <input placeholder="Banco" value={actionForm.payment_bank || ''} onChange={e => setActionForm({...actionForm, payment_bank: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" value={actionForm.payment_date || ''} onChange={e => setActionForm({...actionForm, payment_date: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </>
              )}
              <textarea placeholder="Notas / observaciones" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowActionModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={() => {
                const statusMap = {
                  aprobar_consejo: 'aprobada_consejo', rechazar_consejo: 'rechazada_consejo',
                  en_analisis: 'en_analisis', proveedor: 'proveedor_definido',
                  aprobar_factura: 'factura_recibida', devolver_factura: 'factura_devuelta', pago: 'pagado'
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
