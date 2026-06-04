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

export async function GET(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('purchase_requests')
    .select('*, profiles!purchase_requests_created_by_fkey(full_name), purchase_history(*, profiles(full_name))')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const body = await request.json()

  const { data: current } = await supabaseAdmin.from('purchase_requests').select('status').eq('id', id).single()

  const updates = { ...body }
  delete updates.notes

  const { data, error } = await supabaseAdmin.from('purchase_requests').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status && body.status !== current?.status) {
    await supabaseAdmin.from('purchase_history').insert([{
      purchase_request_id: id,
      changed_by: user.id,
      from_status: current?.status,
      to_status: body.status,
      notes: body.notes || null
    }])
  }

  return NextResponse.json({ data })
}
