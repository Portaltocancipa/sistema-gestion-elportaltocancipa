'use client'

import { useState, useEffect } from 'react'

const roles = [
  { value: 'admin_plataforma', label: 'Administrador Plataforma' },
  { value: 'admin_copropiedad', label: 'Administrador Copropiedad' },
  { value: 'contador', label: 'Contador' },
  { value: 'tesorero', label: 'Tesorero' },
  { value: 'presidente_consejo', label: 'Presidente Consejo' },
  { value: 'secretario_consejo', label: 'Secretario Consejo' },
  { value: 'vocal_consejo', label: 'Vocal Consejo' },
  { value: 'convivencia', label: 'Convivencia' },
  { value: 'copropietario', label: 'Copropietario' },
]

const emptyForm = { username: '', password: '', full_name: '', email: '', role: 'copropietario', apartment: '', phone: '', is_active: true }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchUsuarios = async () => {
    setLoading(true)
    const res = await fetch('/api/usuarios')
    const data = await res.json()
    setUsuarios(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsuarios() }, [])

  const openCreate = () => { setEditUser(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (u) => { setEditUser(u); setForm({ ...u, password: '' }); setError(''); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const method = editUser ? 'PUT' : 'POST'
    const url = editUser ? `/api/usuarios/${editUser.id}` : '/api/usuarios'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Error al guardar'); setSaving(false); return }
    setShowModal(false)
    fetchUsuarios()
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este usuario?')) return
    await fetch(`/api/usuarios/${id}`, { method: 'DELETE' })
    fetchUsuarios()
  }

  const filtered = usuarios.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  const roleLabel = (r) => roles.find(x => x.value === r)?.label || r

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
          <p className="text-slate-500 text-sm">Gestión de usuarios del sistema</p>
        </div>
        <button onClick={openCreate} className="bg-orange-700 hover:bg-orange-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Apto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.username}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{roleLabel(u.role)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.apartment || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-green-700 hover:underline text-xs">Editar</button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No hay usuarios</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Usuario *</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} disabled={!!editUser} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
                <input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{editUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Perfil *</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Apartamento</label>
                  <input value={form.apartment || ''} onChange={e => setForm({...form, apartment: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                  <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              {editUser && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                  <label htmlFor="is_active" className="text-sm text-slate-600">Usuario activo</label>
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
