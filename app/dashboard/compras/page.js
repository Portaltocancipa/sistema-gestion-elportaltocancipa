'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const statusLabels = {
  borrador: 'Borrador', enviada: 'Enviada', aprobada_consejo: 'Aprobada', rechazada_consejo: 'Rechazada',
  en_analisis: 'En Análisis', proveedor_definido: 'Proveedor Def.', pedido_realizado: 'Pedido Realizado',
  factura_recibida: 'Factura Recibida', factura_devuelta: 'Factura Devuelta', pagado: 'Pagado'
}

const statusColors = {
  borrador: 'bg-slate-100 text-slate-600', enviada: 'bg-blue-100 text-blue-700',
  aprobada_consejo: 'bg-green-100 text-green-700', rechazada_consejo: 'bg-red-100 text-red-700',
  en_analisis: 'bg-yellow-100 text-yellow-700', proveedor_definido: 'bg-purple-100 text-purple-700',
  pedido_realizado: 'bg-indigo-100 text-indigo-700', factura_recibida: 'bg-orange-100 text-orange-700',
  factura_devuelta: 'bg-red-100 text-red-600', pagado: 'bg-green-100 text-green-800'
}

const categorias = ['Mantenimiento','Aseo','Servicios Públicos','Seguridad','Administración','Zonas Comunes','Equipos','Otros']

const emptyForm = { title: '', description: '', justification: '', category: '', accounting_account: '', quantity: 1, unit: 'und', estimated_value: 0, priority: 'normal' }

export default function ComprasPage() {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const fetchCompras = async () => {
    setLoading(true)
    const res = await fetch('/api/compras')
    const data = await res.json()
    setCompras(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCompras() }, [])

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al crear'); setSaving(false); return }
    setShowModal(false)
    setForm(emptyForm)
    fetchCompras()
    setSaving(false)
  }

  const filtered = filterStatus ? compras.filter(c => c.status === filterStatus) : compras

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Solicitudes de Compra</h1>
          <p className="text-slate-500 text-sm">Gestión del proceso de compras</p>
        </div>
        <button onClick={() => { setShowModal(true); setError('') }} className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nueva Solicitud
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterStatus('')} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === '' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}>Todos</button>
        {Object.entries(statusLabels).map(([k, v]) => (
          <button key={k} onClick={() => setFilterStatus(k)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === k ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}>{v}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">N° OC</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Valor Est.</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.request_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{c.title}</td>
                  <td className="px-4 py-3 text-slate-600">{c.category}</td>
                  <td className="px-4 py-3 text-slate-600">{c.profiles?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.estimated_total ? `$${c.estimated_total.toLocaleString('es-CO')}` : '-'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${statusColors[c.status]}`}>{statusLabels[c.status]}</span></td>
                  <td className="px-4 py-3"><Link href={`/dashboard/compras/${c.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay solicitudes</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Nueva Solicitud de Compra</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción del bien/servicio *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Justificación *</label>
                <textarea value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Categoría *</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cuenta contable</label>
                  <input value={form.accounting_account} onChange={e => setForm({...form, accounting_account: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad</label>
                  <input type="number" min={1} value={form.quantity} onChange={e => setForm({...form, quantity: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unidad</label>
                  <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor unit. est.</label>
                  <input type="number" min={0} value={form.estimated_value} onChange={e => setForm({...form, estimated_value: parseFloat(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="baja">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <span className="text-slate-600">Total estimado: </span>
                <span className="font-bold text-slate-800">${((form.quantity || 0) * (form.estimated_value || 0)).toLocaleString('es-CO')}</span>
              </div>
            </div>
            {error && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Guardando...' : 'Crear Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
