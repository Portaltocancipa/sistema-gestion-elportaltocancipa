'use client'

import { useState, useEffect } from 'react'

const emptyForm = { name: '', description: '', response_days: 3, is_active: true, recipients: [] }

export default function ParametrosPage() {
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newRecipient, setNewRecipient] = useState({ email: '', recipient_name: '' })

  const fetchTipos = async () => {
    setLoading(true)
    const res = await fetch('/api/parametros')
    const data = await res.json()
    setTipos(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTipos() }, [])

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (t) => {
    setEditItem(t)
    setForm({ name: t.name, description: t.description || '', response_days: t.response_days, is_active: t.is_active, recipients: t.ticket_type_recipients || [] })
    setError('')
    setShowModal(true)
  }

  const addRecipient = () => {
    if (!newRecipient.email || !newRecipient.recipient_name) return
    setForm({ ...form, recipients: [...form.recipients, { ...newRecipient }] })
    setNewRecipient({ email: '', recipient_name: '' })
  }

  const removeRecipient = (idx) => {
    setForm({ ...form, recipients: form.recipients.filter((_, i) => i !== idx) })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const method = editItem ? 'PUT' : 'POST'
    const url = editItem ? `/api/parametros/${editItem.id}` : '/api/parametros'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al guardar'); setSaving(false); return }
    setShowModal(false)
    fetchTipos()
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este tipo de ticket?')) return
    await fetch(`/api/parametros/${id}`, { method: 'DELETE' })
    fetchTipos()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parámetros</h1>
          <p className="text-slate-500 text-sm">Tipos de ticket y tiempos de respuesta</p>
        </div>
        <button onClick={openCreate} className="bg-orange-700 hover:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nuevo Tipo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tipo de Ticket</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Días Respuesta</th>
                <th className="px-4 py-3 font-medium">Destinatarios</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tipos.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{t.description || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{t.response_days} días</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.ticket_type_recipients?.length || 0} correo(s)</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(t)} className="text-green-700 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
              {tipos.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay tipos de ticket</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editItem ? 'Editar Tipo' : 'Nuevo Tipo de Ticket'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Días de respuesta *</label>
                <input type="number" min={1} value={form.response_days} onChange={e => setForm({...form, response_days: parseInt(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Destinatarios de correo</label>
                <div className="flex gap-2 mb-2">
                  <input placeholder="Nombre" value={newRecipient.recipient_name} onChange={e => setNewRecipient({...newRecipient, recipient_name: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <input placeholder="Correo" value={newRecipient.email} onChange={e => setNewRecipient({...newRecipient, email: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button onClick={addRecipient} className="bg-orange-700 text-white px-3 py-2 rounded-lg text-xs">+</button>
                </div>
                {form.recipients.length > 0 && (
                  <div className="space-y-1">
                    {form.recipients.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                        <span>{r.recipient_name} — {r.email}</span>
                        <button onClick={() => removeRecipient(i)} className="text-red-500 ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {editItem && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active_t" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                  <label htmlFor="is_active_t" className="text-sm text-slate-600">Tipo activo</label>
                </div>
              )}
            </div>

            {error && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-700 hover:bg-orange-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
