import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function GET() {
  try {
    await sendEmail({
      to: ['agrupacionelportal11@gmail.com'],
      subject: 'Test correo Portal Tocancipá',
      html: '<h1>Correo de prueba funcionando</h1>'
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
