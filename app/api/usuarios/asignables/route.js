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

const ASSIGNABLE_ROLES = ['admin_copropiedad', 'presidente_consejo', 'secretario_consejo', 'vocal_consejo', 'contador', 'tesorero', 'convivencia']

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role')
    .in('role', ASSIGNABLE_ROLES)
    .eq('is_active', true)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
