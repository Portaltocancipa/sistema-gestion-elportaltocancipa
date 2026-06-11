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

const CREAR_ROLES = ['admin_plataforma','admin_copropiedad','contador','presidente_consejo']
const VER_ROLES = ['admin_plataforma','admin_copropiedad','contador','tesorero','presidente_consejo','secretario_consejo','vocal_consejo']

async function getEmailsByRoles(roles) {
  const { data } = await supabaseAdmin.from('profiles').select('email, role, full_name').in('role', roles).eq('is_active', true)
  return data?.filter(u => u.email) || []
}

export async function GET(request) {
  const user = await getUser()
  if (!user || !VER_ROLES.includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
  const offset = (page - 1) * limit
  const { data, error, count } = await supabaseAdmin
    .from('purchase_requests')
    .select('*, profiles!purchase_requests_created_by_fkey(full_name, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(request) {
  const user = await getUser()
  if (!user || !CREAR_ROLES.includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { title, description, justification, category, accounting_account, quantity, unit, estimated_value, priority } = body

  if (!title || !description || !justification || !category) {
    return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 })
  }

  const estimated_total = (quantity || 1) * (estimated_value || 0)

  const { data, error } = await supabaseAdmin
    .from('purchase_requests')
    .insert([{ title, description, justification, category, accounting_account, quantity, unit, estimated_value, estimated_total, priority: priority || 'normal', created_by: user.id, status: 'enviada' }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('purchase_history').insert([{
    purchase_request_id: data.id, changed_by: user.id, from_status: null, to_status: 'enviada', notes: 'Solicitud creada'
  }])

  // Notificar a Secretario y Presidente (si lo creó el Presidente, solo al Secretario)
  let notifyRoles = ['secretario_consejo', 'presidente_consejo']
  if (user.role === 'presidente_consejo') notifyRoles = ['secretario_consejo']

  const recipients = await getEmailsByRoles(notifyRoles)
  const emails = recipients.map(r => r.email)

  if (emails.length > 0) {
    await sendEmail({
      to: emails,
      subject: `Nueva Solicitud de Compra - ${data.request_number}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1e40af">Nueva Solicitud de Compra</h2>
          <p>Se ha creado una nueva solicitud que requiere su revisión:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">N° Solicitud</td><td style="padding:8px">${data.request_number}</td></tr>
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Título</td><td style="padding:8px">${data.title}</td></tr>
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Categoría</td><td style="padding:8px">${data.category}</td></tr>
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Valor Estimado</td><td style="padding:8px">$${estimated_total.toLocaleString('es-CO')}</td></tr>
            <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Solicitante</td><td style="padding:8px">${user.full_name}</td></tr>
          </table>
          <a href="https://sistema-gestion-elportaltocancipa.vercel.app/dashboard/compras/${data.id}" style="background:#1e40af;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">
            Revisar Solicitud
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
        </div>
      `
    })
  }

  return NextResponse.json({ data })
}
