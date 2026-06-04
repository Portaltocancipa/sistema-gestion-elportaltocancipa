import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  try { return jwt.verify(token, process.env.JWT_SECRET) } catch { return null }
}

async function getEmailsByRoles(roles) {
  const { data } = await supabaseAdmin.from('profiles').select('email, role, full_name').in('role', roles).eq('is_active', true)
  return data?.filter(u => u.email) || []
}

export async function GET(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('purchase_requests')
    .select('*, profiles!purchase_requests_created_by_fkey(full_name, email, role), purchase_history(*, profiles(full_name))')
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

  const { data: current } = await supabaseAdmin
    .from('purchase_requests')
    .select('*, profiles!purchase_requests_created_by_fkey(full_name, email, role)')
    .eq('id', id)
    .single()

  const updates = { ...body }
  const notes = updates.notes
  delete updates.notes

  const { data, error } = await supabaseAdmin.from('purchase_requests').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status && body.status !== current?.status) {
    await supabaseAdmin.from('purchase_history').insert([{
      purchase_request_id: id, changed_by: user.id, from_status: current?.status, to_status: body.status, notes: notes || null
    }])

    const siteUrl = 'https://sistema-gestion-elportaltocancipa.vercel.app'
    const link = `${siteUrl}/dashboard/compras/${id}`

    // Aprobada por Consejo → notificar a Tesorero, Vocal, Presidente, Secretario
    if (body.status === 'aprobada_consejo') {
      const recipients = await getEmailsByRoles(['tesorero','vocal_consejo','presidente_consejo','secretario_consejo'])
      const emails = recipients.map(r => r.email)
      if (emails.length > 0) {
        await sendEmail({
          to: emails,
          subject: `Solicitud Aprobada - ${current.request_number}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#16a34a">Solicitud de Compra Aprobada</h2>
              <p>La solicitud <strong>${current.request_number} - ${current.title}</strong> fue aprobada por el Consejo.</p>
              <p><strong>Cuenta Contable:</strong> ${body.accounting_account || '-'}</p>
              <p><strong>Presupuesto Máximo:</strong> $${(body.max_budget || 0).toLocaleString('es-CO')}</p>
              <p>Ingrese al sistema para continuar con el proceso de compras.</p>
              <a href="${link}" style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Ver Solicitud</a>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
            </div>
          `
        })
      }
    }

    // Rechazada → notificar al solicitante
    if (body.status === 'rechazada_consejo') {
      const solicitanteEmail = current.profiles?.email
      if (solicitanteEmail) {
        await sendEmail({
          to: [solicitanteEmail],
          subject: `Solicitud Rechazada - ${current.request_number}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#dc2626">Solicitud de Compra Rechazada</h2>
              <p>Su solicitud <strong>${current.request_number} - ${current.title}</strong> fue rechazada.</p>
              <p><strong>Motivo:</strong> ${notes || 'Sin motivo especificado'}</p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
            </div>
          `
        })
      }
    }

    // Factura recibida → notificar al Contador
    if (body.status === 'pagado') {
      const recipients = await getEmailsByRoles(['contador'])
      const emails = recipients.map(r => r.email)
      if (emails.length > 0) {
        await sendEmail({
          to: emails,
          subject: `Pago Registrado - ${current.request_number}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#1e40af">Pago Registrado en Compra</h2>
              <p>Se registró el pago de la solicitud <strong>${current.request_number} - ${current.title}</strong>.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Monto Pagado</td><td style="padding:8px">$${(body.payment_amount || 0).toLocaleString('es-CO')}</td></tr>
                <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Referencia</td><td style="padding:8px">${body.payment_reference || '-'}</td></tr>
                <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Cuenta Contable</td><td style="padding:8px">${body.payment_accounting_account || current.accounting_account || '-'}</td></tr>
                <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Fecha Pago</td><td style="padding:8px">${body.payment_date || '-'}</td></tr>
                <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">N° Autorización</td><td style="padding:8px">${body.payment_auth_number || '-'}</td></tr>
              </table>
              <a href="${link}" style="background:#1e40af;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Ver Solicitud</a>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
            </div>
          `
        })
      }
    }
  }

  return NextResponse.json({ data })
}
