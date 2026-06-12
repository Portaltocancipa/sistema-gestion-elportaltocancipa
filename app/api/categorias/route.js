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
  let query = supabaseAdmin.from('categories').select('*').order('name')
  if (searchParams.get('show_in_compras') === 'true') query = query.eq('show_in_compras', true)
  if (searchParams.get('show_in_tickets') === 'true') query = query.eq('show_in_tickets', true)
  if (searchParams.get('active') !== 'false') query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const user = await getUser()
  if (!user || !['admin_plataforma','admin_copropiedad'].includes(user.role))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const body = await request.json()
  const { name, show_in_compras, show_in_tickets } = body
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('categories').insert([{ name, show_in_compras: !!show_in_compras, show_in_tickets: !!show_in_tickets }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
