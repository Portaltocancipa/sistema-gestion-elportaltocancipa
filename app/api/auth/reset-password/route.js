import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request) {
  try {
    const { token, password } = await request.json()
    if (!token || !password) return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 })

    if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres' }, { status: 400 })
    if (!/\d/.test(password)) return NextResponse.json({ error: 'La contraseña debe contener al menos un número' }, { status: 400 })

    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single()

    if (!user) return NextResponse.json({ error: 'Token inválido o ya utilizado' }, { status: 400 })
    if (new Date(user.reset_token_expires) < new Date()) {
      return NextResponse.json({ error: 'El enlace ha expirado. Solicita uno nuevo.' }, { status: 400 })
    }

    const password_hash = await bcrypt.hash(password, 10)
    await supabaseAdmin
      .from('profiles')
      .update({ password_hash, reset_token: null, reset_token_expires: null })
      .eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
