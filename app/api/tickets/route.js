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
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json()
  const { ticket_type_id, title, description, apartment } = body

  if (!ticket_type_id || !title || !description || !apartment) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
  }

  const { data: ticketType } = await supabaseAdmin
    .from('ticket_types')
    .select('response_days')
    .eq('id', ticket_type_id)
    .single()

  const due_date = new Date()
  due_date.setDate(due_date.getDate() + (ticketType?.response_days || 3))

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .insert([{ ticket_type_id, title, description, priority: 'normal', apartment, created_by: user.id, due_date: due_date.toISOString().split('T')[0] }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
