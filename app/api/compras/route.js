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

const ALLOWED_ROLES = ['admin_plataforma','admin_copropiedad','contador','tesorero','presidente_consejo','secretario_consejo','vocal_consejo']

export async function GET() {
  const user = await getUser()
  if (!user || !ALLOWED_ROLES.includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('purchase_requests')
    .select('*, profiles!purchase_requests_created_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const user = await getUser()
  if (!user || !ALLOWED_ROLES.includes(user.role)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

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
    purchase_request_id: data.id,
    changed_by: user.id,
    from_status: null,
    to_status: 'enviada',
    notes: 'Solicitud creada'
  }])

  return NextResponse.json({ data })
}
