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
  const { data } = await supabaseAdmin.from('profiles').select('email, full_name').in('role', roles).eq('is_active', true)
  return data?.filter(u => u.email) || []
}

const CONSEJO_ROLES = ['presidente_consejo', 'secretario_consejo']
const GESTION_ROLES = ['secretario_consejo', 'vocal_consejo']
const TESORERIA_ROLES = ['tesorero', 'contador']

const VALID_TRANSITIONS = {
  enviada: ['aprobada_consejo', 'rechazada_consejo', 'compra_directa', 'retirada'],
  aprobada_consejo: ['proveedor_definido'],
  proveedor_definido: ['factura_recibida'],
  factura_recibida: ['pagado', 'factura_devuelta'],
  factura_devuelta: ['factura_recibida'],
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
  if (!user || user.role === 'copropietario') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const { data: current } = await supabaseAdmin
    .from('purchase_requests')
    .select('*, profiles!purchase_requests_created_by_fkey(full_name, email, role)')
    .eq('id', id)
    .single()

  if (body.status) {
    if (user.role === 'admin_plataforma')
      return NextResponse.json({ error: 'No puede modificar el flujo de solicitudes' }, { status: 403 })

    const validNext = VALID_TRANSITIONS[current?.status] || []
    if (!validNext.includes(body.status))
      return NextResponse.json({ error: 'Transición de estado no válida' }, { status: 400 })

    if (['aprobada_consejo', 'rechazada_consejo', 'compra_directa'].includes(body.status)) {
      if (!CONSEJO_ROLES.includes(user.role))
        return NextResponse.json({ error: 'Solo el Consejo puede aprobar o rechazar' }, { status: 403 })
      if (current?.created_by === user.id)
        return NextResponse.json({ error: 'No puede aprobar su propia solicitud' }, { status: 403 })
    }
    if (body.status === 'retirada') {
      if (current?.created_by !== user.id)
        return NextResponse.json({ error: 'Solo quien creó la solicitud puede retirarla' }, { status: 403 })
    }
    if (body.status === 'proveedor_definido') {
      if (!GESTION_ROLES.includes(user.role))
        return NextResponse.json({ error: 'Solo Secretario o Vocal pueden definir características' }, { status: 403 })
    }
    if (['factura_recibida', 'factura_devuelta', 'pagado'].includes(body.status)) {
      if (!TESORERIA_ROLES.includes(user.role))
        return NextResponse.json({ error: 'Solo Tesorería puede realizar esta acción' }, { status: 403 })
    }
  }

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
    const reqNum = current.request_number
    const reqTitle = current.title
    const creatorEmail = current.profiles?.email

    if (body.status === 'aprobada_consejo') {
      const recipients = await getEmailsByRoles(GESTION_ROLES)
      const emails = [...new Set([...recipients.map(r => r.email), ...(creatorEmail ? [creatorEmail] : [])])]
      if (emails.length > 0) {
        await sendEmail({
          to: emails,
          subject: `Solicitud Aprobada — ${reqNum}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#16a34a">Solicitud Aprobada por el Consejo</h2>
            <p>La solicitud <strong>${reqNum} — ${reqTitle}</strong> fue aprobada.</p>
            <p><strong>Monto presupuesto aprobado:</strong> $${(body.max_budget || 0).toLocaleString('es-CO')}</p>
            <p><strong>Cuenta Contable:</strong> ${body.accounting_account || '—'}</p>
            ${notes ? `<p><strong>Observaciones:</strong> ${notes}</p>` : ''}
            <a href="${link}" style="background:#16a34a;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:12px">Ver Solicitud</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>`
        })
      }
    }

    if (body.status === 'rechazada_consejo') {
      if (creatorEmail) {
        await sendEmail({
          to: [creatorEmail],
          subject: `Solicitud Rechazada — ${reqNum}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Solicitud Rechazada</h2>
            <p>Su solicitud <strong>${reqNum} — ${reqTitle}</strong> fue rechazada.</p>
            <p><strong>Motivo:</strong> ${notes || 'Sin motivo especificado'}</p>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>`
        })
      }
    }

    if (body.status === 'compra_directa') {
      if (creatorEmail) {
        await sendEmail({
          to: [creatorEmail],
          subject: `Compra Directa Aprobada — ${reqNum}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#d97706">Compra Directa Aprobada</h2>
            <p>Su solicitud <strong>${reqNum} — ${reqTitle}</strong> fue aprobada como <strong>compra directa por solicitante</strong>.</p>
            <p><strong>Monto aprobado:</strong> $${(body.max_budget || 0).toLocaleString('es-CO')}</p>
            ${notes ? `<p><strong>Observaciones:</strong> ${notes}</p>` : ''}
            <a href="${link}" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:12px">Ver Solicitud</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>`
        })
      }
    }

    if (body.status === 'proveedor_definido') {
      const recipients = await getEmailsByRoles(TESORERIA_ROLES)
      if (recipients.length > 0) {
        await sendEmail({
          to: recipients.map(r => r.email),
          subject: `Solicitud Lista para Tesorería — ${reqNum}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#7c3aed">Solicitud Lista para Gestión de Tesorería</h2>
            <p>La solicitud <strong>${reqNum} — ${reqTitle}</strong> tiene sus características definidas.</p>
            <a href="${link}" style="background:#7c3aed;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:12px">Ver Solicitud</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>`
        })
      }
    }

    if (body.status === 'factura_devuelta') {
      const recipients = await getEmailsByRoles(GESTION_ROLES)
      if (recipients.length > 0) {
        await sendEmail({
          to: recipients.map(r => r.email),
          subject: `Factura Devuelta — ${reqNum}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Factura Devuelta por Tesorería</h2>
            <p>La factura de la solicitud <strong>${reqNum} — ${reqTitle}</strong> fue devuelta.</p>
            <p><strong>Motivo:</strong> ${notes || 'Sin motivo especificado'}</p>
            <a href="${link}" style="background:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin-top:12px">Ver Solicitud</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>`
        })
      }
    }

    if (body.status === 'pagado') {
      const recipients = await getEmailsByRoles(['contador'])
      const emails = [...new Set([...recipients.map(r => r.email), ...(creatorEmail ? [creatorEmail] : [])])]
      if (emails.length > 0) {
        await sendEmail({
          to: emails,
          subject: `Pago Registrado — ${reqNum}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1e40af">Pago Registrado</h2>
            <p>Se registró el pago de <strong>${reqNum} — ${reqTitle}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Monto Pagado</td><td style="padding:8px">$${(body.payment_amount || 0).toLocaleString('es-CO')}</td></tr>
              <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Referencia</td><td style="padding:8px">${body.payment_reference || '—'}</td></tr>
              <tr><td style="padding:8px;background:#f1f5f9;font-weight:bold">Fecha</td><td style="padding:8px">${body.payment_date || '—'}</td></tr>
            </table>
            <a href="${link}" style="background:#1e40af;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block">Ver Solicitud</a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>`
        })
      }
    }

    if (body.status === 'retirada') {
      const recipients = await getEmailsByRoles(CONSEJO_ROLES)
      if (recipients.length > 0) {
        await sendEmail({
          to: recipients.map(r => r.email),
          subject: `Solicitud Retirada — ${reqNum}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#64748b">Solicitud Retirada</h2>
            <p>La solicitud <strong>${reqNum} — ${reqTitle}</strong> fue retirada por su solicitante.</p>
            ${notes ? `<p><strong>Motivo:</strong> ${notes}</p>` : ''}
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Agrupación de Vivienda Portal de Tocancipá P.H.</p>
          </div>`
        })
      }
    }
  }

  return NextResponse.json({ data })
}

export async function DELETE(request, { params }) {
  const user = await getUser()
  if (!user || user.role !== 'admin_plataforma')
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('purchase_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
