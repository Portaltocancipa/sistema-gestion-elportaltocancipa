import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  try { return jwt.verify(token, process.env.JWT_SECRET) } catch { return null }
}

const STAFF_ROLES = ['admin_plataforma', 'admin_copropiedad', 'secretario_consejo', 'presidente_consejo', 'vocal_consejo', 'tesorero', 'contador', 'convivencia']

export async function GET(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select('*, ticket_types(name, response_days), profiles!tickets_created_by_fkey(full_name, apartment, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email), ticket_messages(*, profiles(full_name, role)), ticket_attachments(*)')
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

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('*, ticket_types(name), profiles!tickets_created_by_fkey(full_name, email), assigned:profiles!tickets_assigned_to_fkey(full_name, email)')
    .eq('id', id)
    .single()

  // Reasignación — solo admin_plataforma
  if (body.assigned_to !== undefined) {
    if (user.role !== 'admin_plataforma')
      return NextResponse.json({ error: 'Solo el administrador puede reasignar tickets' }, { status: 403 })

    const { data: newAssignee } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', body.assigned_to)
      .single()

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update({ assigned_to: body.assigned_to })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const siteUrl = 'https://sistema-gestion-elportaltocancipa.vercel.app'
    if (newAssignee?.email) {
      await sendEmail({
        to: [newAssignee.email],
        subject: `Ticket reasignado a usted — ${ticket.ticket_number}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#15803d">Ticket Reasignado</h2>
          <p>Hola <strong>${newAssignee.full_name}</strong>, el siguiente ticket ha sido reasignado a usted.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">N° Ticket</td><td style="padding:8px">${ticket.ticket_number}</td></tr>
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Título</td><td style="padding:8px">${ticket.title}</td></tr>
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Tipo</td><td style="padding:8px">${ticket.ticket_types?.name || '-'}</td></tr>
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Creado por</td><td style="padding:8px">${ticket.profiles?.full_name || '-'}</td></tr>
          </table>
          <a href="${siteUrl}/dashboard/tickets/${id}" style="background:#15803d;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Ver Ticket</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
        </div>`
      })
    }

    return NextResponse.json({ data })
  }

  // Cambio de estado
  if (user.role === 'copropietario') {
    if (ticket?.created_by !== user.id)
      return NextResponse.json({ error: 'No puede modificar tickets de otros usuarios' }, { status: 403 })
    if (body.status !== 'cerrado')
      return NextResponse.json({ error: 'Solo puede cerrar sus propios tickets' }, { status: 403 })
  } else if (user.role === 'admin_plataforma') {
    // puede todo
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

export async function DELETE(request, { params }) {
  const user = await getUser()
  if (!user || user.role !== 'admin_plataforma')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('tickets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
