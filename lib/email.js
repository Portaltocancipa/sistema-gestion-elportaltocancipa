import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM || 'El Portal de Tocancipá <onboarding@resend.dev>'

export async function sendEmail({ to, subject, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return { ok: true }
  try {
    const toList = Array.isArray(to) ? to : [to]
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: toList,
      subject,
      html,
    })
    if (error) {
      console.error('Resend error:', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, data }
  } catch (err) {
    console.error('Error enviando correo:', err)
    return { ok: false, error: err.message }
  }
}
