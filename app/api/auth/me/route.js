import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return NextResponse.json({ user: decoded })
  } catch {
    return NextResponse.json({ user: null })
  }
}
