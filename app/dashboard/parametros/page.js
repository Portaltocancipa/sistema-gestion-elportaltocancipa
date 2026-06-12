'use client'

import { useState, useEffect } from 'react'

const emptyTipoForm = { name: '', description: '', response_days: 3, is_active: true, recipients: [] }
const emptyCatForm = { name: '', show_in_compras: false, show_in_tickets: false }

export default function ParametrosPage() {
  const [tab, setTab] = useState('tipos')

  // ── Tipos de Ticket ────────────────────────────────
  const [tipos, setTipos] = useState([])
  const [tiposLoading, setTiposLoading] = useState(true)
  const [showTipoModal, setShowTipoModal] = useState(false)
  const [editTipo, setEditTipo] = useState(null)
  const [tipoForm, setTipoForm] = useState(emptyTipoForm)
  const [tipoSaving, setTipoSaving] = useState(false)
  const [tipoError, setTipoError] = useState('')
  const [newRecipient, setNewRecipient] = useState({ email: '', recipient_name: '' })

  // ── Categorías ─────────────────────────────────────
  const [cats, setCats] = useState([])
  const [catsLoading, setCatsLoading] = useState(true)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [catForm, setCatForm] = useState(emptyCatForm)
  const [catSaving, setCatSaving] = useState(false)
  const [catError, setCatError] = useState('')

  useEffect(() => { fetchTipos(); fetchCats() }, [])

  const fetchTipos = async () => {
    setTiposLoading(true)
    const res = await fetch('/api/parametros')
    const data = await res.json()
    setTipos(data.data || [])
    setTiposLoading(false)
  }

  const fetchCats = async () => {
    setCatsLoading(true)
    const res = await fetch('/api/categorias?active=false')
    const data = await res.json()
    setCats(data.data || [])
    setCatsLoading(false)
  }

  // Tipos handlers
  const openCreateTipo = () => { setEditTipo(null); setTipoForm(emptyTipoForm); setTipoError(''); setShowTipoModal(true) }
  const openEditTipo = (t) => {
    setEditTipo(t)
    setTipoForm({ name: t.name, description: t.description || '', response_days: t.response_days, is_active: t.is_active, recipients: t.ticket_type_recipients || [] })
    setTipoError('')
    setShowTipoModal(true)
  }
  const addRecipient = () => {
    if (!newRecipient.email || !newRecipient.recipient_name) return
    setTipoForm({ ...tipoForm, recipients: [...tipoForm.recipients, { ...newRecipient }] })
    setNewRecipient({ email: '', recipient_name: '' })
  }
  const removeRecipient = (idx) => setTipoForm({ ...tipoForm, recipients: tipoForm.recipients.filter((_, i) => i !== idx) })
  const handleSaveTipo = async () => {
    setTipoSaving(true); setTipoError('')
    const method = editTipo ? 'PUT' : 'POST'
    const url = editTipo ? `/api/parametros/${editTipo.id}` : '/api/parametros'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tipoForm) })
    const data = await res.json()
    if (!res.ok) { setTipoError(data.error || 'Error al guardar'); setTipoSaving(false); return }
    setShowTipoModal(false); fetchTipos(); setTipoSaving(false)
  }
  const handleDeleteTipo = async (id) => {
    if (!confirm('¿Eliminar este tipo de ticket?')) return
    await fetch(`/api/parametros/${id}`, { method: 'DELETE' })
    fetchTipos()
  }

  // Categorías handlers
  const openCreateCat = () => { setEditCat(null); setCatForm(emptyCatForm); setCatError(''); setShowCatModal(true) }
  const openEditCat = (c) => {
    setEditCat(c)
    setCatForm({ name: c.name, show_in_compras: c.show_in_compras, show_in_tickets: c.show_in_tickets, is_active: c.is_active })
    setCatError('')
    setShowCatModal(true)
  }
  const handleSaveCat = async () => {
    setCatSaving(true); setCatError('')
    const method = editCat ? 'PUT' : 'POST'
    const url = editCat ? `/api/categorias/${editCat.id}` : '/api/categorias'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) })
    const data = await res.json()
    if (!res.ok) { setCatError(data.error || 'Error al guardar'); setCatSaving(false); return }
    setShowCatModal(false); fetchCats(); setCatSaving(false)
  }
  const handleDeleteCat = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    await fetch(`/api/categorias/${id}`, { method: 'DELETE' })
    fetchCats()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parámetros</h1>
          <p className="text-slate-500 text-sm">Tipos de ticket y categorías del sistema</p>
        </div>
        <button
          onClick={tab === 'tipos' ? openCreateTipo : openCreateCat}
          className="bg-orange-700 hover:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {tab === 'tipos' ? '+ Nuevo Tipo' : '+ Nueva Categoría'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('tipos')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'tipos' ? 'bg-white shadow-sm text-green-800' : 'text-slate-600 hover:text-slate-800'}`}>
          🎫 Tipos de Ticket
        </button>
        <button onClick={() => setTab('categorias')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'categorias' ? 'bg-white shadow-sm text-green-800' : 'text-slate-600 hover:text-slate-800'}`}>
          🏷 Categorías
        </button>
      </div>

      {/* ── Tipos de Ticket ── */}
      {tab === 'tipos' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {tiposLoading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : (
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
                    <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{t.response_days} días</span></td>
                    <td className="px-4 py-3 text-slate-600">{t.ticket_type_recipients?.length || 0} correo(s)</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.is_active ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => openEditTipo(t)} className="text-green-700 hover:underline text-xs">Editar</button>
                      <button onClick={() => handleDeleteTipo(t.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                    </td>
                  </tr>
                ))}
                {tipos.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay tipos de ticket</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Categorías ── */}
      {tab === 'categorias' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {catsLoading ? <div className="p-8 text-center text-slate-400">Cargando...</div> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium text-center">Compras</th>
                  <th className="px-4 py-3 font-medium text-center">Tickets</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cats.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${c.show_in_compras ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {c.show_in_compras ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${c.show_in_tickets ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                        {c.show_in_tickets ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.is_active ? 'Activa' : 'Inactiva'}</span></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => openEditCat(c)} className="text-green-700 hover:underline text-xs">Editar</button>
                      <button onClick={() => handleDeleteCat(c.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                    </td>
                  </tr>
                ))}
                {cats.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay categorías. Cree la primera.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal tipos de ticket */}
      {showTipoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editTipo ? 'Editar Tipo' : 'Nuevo Tipo de Ticket'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input value={tipoForm.name} onChange={e => setTipoForm({...tipoForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                <textarea value={tipoForm.description} onChange={e => setTipoForm({...tipoForm, description: e.target.value})} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Días de respuesta *</label>
                <input type="number" min={1} value={tipoForm.response_days} onChange={e => setTipoForm({...tipoForm, response_days: parseInt(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Destinatarios de correo</label>
                <div className="flex gap-2 mb-2">
                  <input placeholder="Nombre" value={newRecipient.recipient_name} onChange={e => setNewRecipient({...newRecipient, recipient_name: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <input placeholder="Correo" value={newRecipient.email} onChange={e => setNewRecipient({...newRecipient, email: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button onClick={addRecipient} className="bg-orange-700 text-white px-3 py-2 rounded-lg text-xs">+</button>
                </div>
                {tipoForm.recipients.length > 0 && (
                  <div className="space-y-1">
                    {tipoForm.recipients.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                        <span>{r.recipient_name} — {r.email}</span>
                        <button onClick={() => removeRecipient(i)} className="text-red-500 ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {editTipo && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active_t" checked={tipoForm.is_active} onChange={e => setTipoForm({...tipoForm, is_active: e.target.checked})} />
                  <label htmlFor="is_active_t" className="text-sm text-slate-600">Tipo activo</label>
                </div>
              )}
            </div>
            {tipoError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{tipoError}</div>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTipoModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSaveTipo} disabled={tipoSaving} className="flex-1 bg-orange-700 hover:bg-orange-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {tipoSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal categorías */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editCat ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Módulos donde aparece</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={catForm.show_in_compras} onChange={e => setCatForm({...catForm, show_in_compras: e.target.checked})} className="w-4 h-4 rounded accent-green-700" />
                    <span className="text-sm text-slate-700">🛒 Módulo de Compras</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={catForm.show_in_tickets} onChange={e => setCatForm({...catForm, show_in_tickets: e.target.checked})} className="w-4 h-4 rounded accent-green-700" />
                    <span className="text-sm text-slate-700">🎫 Módulo de Tickets</span>
                  </label>
                </div>
              </div>
              {editCat && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={catForm.is_active} onChange={e => setCatForm({...catForm, is_active: e.target.checked})} className="w-4 h-4 rounded accent-green-700" />
                  <span className="text-sm text-slate-600">Categoría activa</span>
                </label>
              )}
            </div>
            {catError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{catError}</div>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCatModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSaveCat} disabled={catSaving} className="flex-1 bg-orange-700 hover:bg-orange-800 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {catSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
