import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail({ to, subject, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return
  try {
    await transporter.sendMail({
      from: `"El Portal de Tocancipá" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    })
  } catch (err) {
    console.error('Error enviando correo:', err)
  }
}
