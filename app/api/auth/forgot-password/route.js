import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.trim().toLowerCase())
      .eq('is_active', true)
      .single()

    // Always return success to avoid user enumeration
    if (!user) return NextResponse.json({ success: true })

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    await supabaseAdmin
      .from('profiles')
      .update({ reset_token: token, reset_token_expires: expires })
      .eq('id', user.id)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sistema-gestion-elportaltocancipa.vercel.app'
    const link = `${siteUrl}/reset-password?token=${token}`

    await sendEmail({
      to: user.email,
      subject: 'Recuperación de contraseña — El Portal de Tocancipá',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e40af;padding:24px;border-radius:12px 12px 0 0;text-align:center">
            <span style="color:white;font-size:24px;font-weight:bold">EP</span>
          </div>
          <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="color:#1e293b;margin-top:0">Recuperación de contraseña</h2>
            <p style="color:#64748b">Hola <strong>${user.full_name}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
            <p style="color:#64748b">Haz clic en el botón de abajo. Este enlace es válido por <strong>1 hora</strong>.</p>
            <div style="text-align:center;margin:32px 0">
              <a href="${link}" style="background:#1e40af;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block">
                Restablecer contraseña
              </a>
            </div>
            <p style="color:#94a3b8;font-size:12px">Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="color:#94a3b8;font-size:12px;text-align:center">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
