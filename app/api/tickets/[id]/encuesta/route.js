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

export async function POST(request, { params }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  const { survey_satisfied, survey_rating, survey_observations } = await request.json()

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('created_by, status, survey_completed_at')
    .eq('id', id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })
  if (ticket.created_by !== user.id) return NextResponse.json({ error: 'Solo quien creó el ticket puede responder la encuesta' }, { status: 403 })
  if (!['resuelto', 'cerrado'].includes(ticket.status)) return NextResponse.json({ error: 'El ticket debe estar resuelto' }, { status: 400 })
  if (ticket.survey_completed_at) return NextResponse.json({ error: 'La encuesta ya fue completada' }, { status: 400 })

  if (survey_rating !== undefined && (survey_rating < 1 || survey_rating > 5))
    return NextResponse.json({ error: 'La calificación debe ser entre 1 y 5' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .update({ survey_satisfied, survey_rating, survey_observations: survey_observations || null, survey_completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
