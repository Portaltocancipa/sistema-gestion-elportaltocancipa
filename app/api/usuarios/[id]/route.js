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

export async function PUT(request, { params }) {
  const user = await getUser()
  if (!user || user.role !== 'admin_plataforma') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json()
  const updates = {
    full_name: body.full_name,
    role: body.role,
    apartment: body.apartment,
    phone: body.phone,
    email: body.email,
    is_active: body.is_active
  }
  if (body.password) updates.password_hash = await bcrypt.hash(body.password, 10)
  const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request, { params }) {
  const user = await getUser()
  if (!user || user.role !== 'admin_plataforma') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { id } = await params
  const { error } = await supabaseAdmin.from('profiles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
