import { createHmac, timingSafeEqual } from 'node:crypto'
import { COOKIE_NAME, SESSION_TTL_MS, SESSION_TTL_SEC } from './constants'

const DEV_SECRET = 'folio-dev-only-not-for-production'

export function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET
  if (fromEnv && fromEnv.length >= 16) return fromEnv
  if (process.env.VERCEL) return 'folio-vercel-demo-secret-01'
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set SESSION_SECRET to at least 16 characters in production')
  }
  return DEV_SECRET
}

export function cookieIsSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true
  if (process.env.COOKIE_SECURE === 'false') return false
  return process.env.NODE_ENV === 'production'
}

export function sessionCookie(token: string, maxAge = SESSION_TTL_SEC) {
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: cookieIsSecure(),
      path: '/',
      maxAge,
    },
  }
}

export function signSession(userId: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ uid: userId, exp: now + SESSION_TTL_MS })).toString('base64url')
  const sig = createHmac('sha256', sessionSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function readSession(token: string | undefined | null, now = Date.now()): string | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', sessionSecret()).update(body).digest('base64url')
  const actualBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as { uid?: unknown; exp?: unknown }
    if (typeof payload.uid !== 'string' || payload.uid.length === 0) return null
    if (typeof payload.exp !== 'number' || payload.exp < now) return null
    return payload.uid
  } catch {
    return null
  }
}
