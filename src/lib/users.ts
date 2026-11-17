import type { Db } from './db'
import { hashPassword, verifyPassword } from './passwords'
import type { PublicUser } from './types'

type UserRow = {
  id: string
  email: string
  name: string
  password_hash: string
}

let dummyHash: string | null = null

function dummyPasswordHash(): string {
  if (!dummyHash) dummyHash = hashPassword('not-a-real-password')
  return dummyHash
}

export function getUserById(db: Db, id: string): PublicUser | null {
  const row = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(id) as PublicUser | undefined
  return row ?? null
}

export function getUserByEmail(db: Db, email: string): PublicUser | null {
  const row = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email) as PublicUser | undefined
  return row ?? null
}

export function authenticate(db: Db, email: string, password: string): PublicUser | null {
  const normalized = email.trim().toLowerCase()
  const row = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(normalized) as
    | UserRow
    | undefined
  const ok = verifyPassword(password, row?.password_hash ?? dummyPasswordHash())
  if (!row || !ok) return null
  return { id: row.id, email: row.email, name: row.name }
}
