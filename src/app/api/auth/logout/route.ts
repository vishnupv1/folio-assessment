import { NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { sessionCookie } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = api(async () => {
  const res = NextResponse.json({ ok: true })
  const cookie = sessionCookie('', 0)
  res.cookies.set(cookie.name, '', cookie.options)
  return res
})
