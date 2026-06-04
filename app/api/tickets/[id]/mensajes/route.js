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

export async function POST(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const { message, is_internal } = body
  if (!message) return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .insert([{ ticket_id: id, author_id: user.id, message, is_internal: is_internal || false }])
    .select('*, profiles(full_name, role)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
