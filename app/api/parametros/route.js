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

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { data, error } = await supabaseAdmin
    .from('ticket_types')
    .select('*, ticket_type_recipients(*)')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const user = await getUser()
  if (!user || !['admin_plataforma','admin_copropiedad'].includes(user.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const body = await request.json()
  const { name, description, response_days, recipients } = body
  if (!name || !response_days) return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('ticket_types').insert([{ name, description, response_days }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (recipients?.length) {
    const rows = recipients.map(r => ({ ticket_type_id: data.id, email: r.email, recipient_name: r.recipient_name }))
    await supabaseAdmin.from('ticket_type_recipients').insert(rows)
  }
  return NextResponse.json({ data })
}
