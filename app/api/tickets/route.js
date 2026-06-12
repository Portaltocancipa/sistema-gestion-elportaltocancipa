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

export async function GET(request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('tickets')
    .select('*, ticket_types(name), profiles!tickets_created_by_fkey(full_name, apartment), assigned:profiles!tickets_assigned_to_fkey(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (user.role === 'copropietario') {
    query = query.eq('created_by', user.id)
  } else if (user.role !== 'admin_plataforma') {
    query = query.eq('assigned_to', user.id)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { ticket_type_id, title, description, apartment, assigned_to } = body

  if (!ticket_type_id || !title || !description || !apartment || !assigned_to) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
  }

  const [{ data: ticketType }, { data: assignee }] = await Promise.all([
    supabaseAdmin.from('ticket_types').select('name, response_days').eq('id', ticket_type_id).single(),
    supabaseAdmin.from('profiles').select('full_name, email').eq('id', assigned_to).single(),
  ])

  const due_date = new Date()
  due_date.setDate(due_date.getDate() + (ticketType?.response_days || 3))

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .insert([{ ticket_type_id, title, description, priority: 'normal', apartment, assigned_to, created_by: user.id, due_date: due_date.toISOString().split('T')[0] }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (assignee?.email) {
    const siteUrl = 'https://sistema-gestion-elportaltocancipa.vercel.app'
    await sendEmail({
      to: [assignee.email],
      subject: `Nuevo ticket asignado — ${data.ticket_number}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#15803d">Ticket asignado a usted</h2>
        <p>Hola <strong>${assignee.full_name}</strong>, se le ha asignado un nuevo ticket.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">N° Ticket</td><td style="padding:8px">${data.ticket_number}</td></tr>
          <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Tipo</td><td style="padding:8px">${ticketType?.name || '-'}</td></tr>
          <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Título</td><td style="padding:8px">${title}</td></tr>
          <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Torre - Apto</td><td style="padding:8px">${apartment}</td></tr>
          <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Descripción</td><td style="padding:8px">${description}</td></tr>
          <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Fecha límite</td><td style="padding:8px">${due_date.toLocaleDateString('es-CO')}</td></tr>
        </table>
        <a href="${siteUrl}/dashboard/tickets/${data.id}" style="background:#15803d;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Ver Ticket</a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
      </div>`
    })
  }

  return NextResponse.json({ data })
}
