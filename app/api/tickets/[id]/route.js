import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  try { return jwt.verify(token, process.env.JWT_SECRET) } catch { return null }
}

const STAFF_ROLES = ['admin_plataforma', 'admin_copropiedad', 'secretario_consejo', 'presidente_consejo', 'vocal_consejo', 'tesorero', 'contador']
const ADMIN_ROLES = ['admin_plataforma', 'admin_copropiedad']

export async function GET(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select('*, ticket_types(name, response_days), profiles!tickets_created_by_fkey(full_name, apartment), assigned:profiles!tickets_assigned_to_fkey(full_name), ticket_messages(*, profiles(full_name, role)), ticket_attachments(*)')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (user.role === 'copropietario' && data?.ticket_messages) {
    data.ticket_messages = data.ticket_messages.filter(m => !m.is_internal)
  }
  return NextResponse.json({ data })
}

export async function PUT(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const body = await request.json()

  const { data: ticket } = await supabaseAdmin.from('tickets').select('created_by, assigned_to').eq('id', id).single()

  if (user.role === 'copropietario') {
    if (ticket?.created_by !== user.id)
      return NextResponse.json({ error: 'No puede modificar tickets de otros usuarios' }, { status: 403 })
    if (body.status !== 'cerrado')
      return NextResponse.json({ error: 'Solo puede cerrar sus propios tickets' }, { status: 403 })
  } else if (user.role === 'admin_plataforma') {
    // admin_plataforma puede todo
  } else if (STAFF_ROLES.includes(user.role)) {
    if (ticket?.assigned_to !== user.id)
      return NextResponse.json({ error: 'Solo la persona asignada puede gestionar este ticket' }, { status: 403 })
  } else {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const updates = {}
  if (body.status) updates.status = body.status
  if (body.status === 'resuelto') updates.resolved_at = new Date().toISOString()
  if (body.status === 'cerrado') updates.closed_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('tickets').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
