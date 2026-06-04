import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({ to, subject, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return
  try {
    await resend.emails.send({
      from: 'El Portal de Tocancipá <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    })
  } catch (err) {
    console.error('Error enviando correo:', err)
  }
}
