import { afterEach, describe, expect, it, vi } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/passwords'
import { readSession, sessionSecret, signSession } from '@/lib/session'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('session cookie', () => {
  it('round-trips a user id and rejects tampering or expiry', () => {
    vi.stubEnv('SESSION_SECRET', 'test-secret-please')
    const token = signSession('user_alex', 1_000)
    expect(readSession(token, 1_000)).toBe('user_alex')
    expect(readSession(token, 1_000 + 8 * 24 * 60 * 60 * 1000)).toBeNull()
    const [body, sig] = token.split('.')
    const flipped = `${sig.slice(0, -1)}${sig.endsWith('a') ? 'b' : 'a'}`
    expect(readSession(`${body}.${flipped}`, 1_000)).toBeNull()
    expect(readSession('nope', 1_000)).toBeNull()
    expect(readSession(undefined, 1_000)).toBeNull()
  })

  it('refuses to boot production without a real secret', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SESSION_SECRET', '')
    expect(() => sessionSecret()).toThrow(/SESSION_SECRET/)
    vi.stubEnv('SESSION_SECRET', 'short')
    expect(() => sessionSecret()).toThrow(/SESSION_SECRET/)
  })
})

describe('passwords', () => {
  it('verifies the demo password and rejects a wrong one', () => {
    const hashed = hashPassword('folio-demo')
    expect(verifyPassword('folio-demo', hashed)).toBe(true)
    expect(verifyPassword('nope', hashed)).toBe(false)
    expect(verifyPassword('folio-demo', 'garbage')).toBe(false)
  })
})
