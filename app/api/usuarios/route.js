import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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
  if (!user || user.role !== 'admin_plataforma') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id,username,full_name,role,apartment,phone,email,is_active,created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request) {
  const user = await getUser()
  if (!user || user.role !== 'admin_plataforma') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const body = await request.json()
  const { username, password, full_name, role, apartment, phone, email } = body
  if (!username || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Campos requeridos incompletos' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres' }, { status: 400 })
  }
  if (!/\d/.test(password)) {
    return NextResponse.json({ error: 'La contraseña debe contener al menos un número' }, { status: 400 })
  }
  const password_hash = await bcrypt.hash(password, 10)
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert([{ username, password_hash, full_name, role, apartment, phone, email }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
