import { NextResponse } from 'next/server'
import { api, readJson } from '@/lib/api'
import { getDb } from '@/lib/bootstrap'
import { HttpError } from '@/lib/errors'
import { sessionCookie, signSession } from '@/lib/session'
import { authenticate } from '@/lib/users'
import { normalizeEmail } from '@/lib/validators'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = api(async (req) => {
  const body = await readJson(req)
  if (typeof body.password !== 'string' || body.password.length === 0 || body.password.length > 200) {
    throw new HttpError(400, 'Enter your password')
  }
  const email = normalizeEmail(body.email)
  const user = await authenticate(await getDb(), email, body.password)
  if (!user) throw new HttpError(401, "Those credentials don't match a Folio account.")
  const res = NextResponse.json({ user })
  const cookie = sessionCookie(signSession(user.id))
  res.cookies.set(cookie.name, cookie.value, cookie.options)
  return res
})
