import type { Db, UserDoc } from './db'
import { hashPassword, verifyPassword } from './passwords'
import type { PublicUser } from './types'

let dummyHash: string | null = null

function dummyPasswordHash(): string {
  if (!dummyHash) dummyHash = hashPassword('not-a-real-password')
  return dummyHash
}

function publicUser(row: UserDoc): PublicUser {
  return { id: row._id, email: row.email, name: row.name }
}

export async function getUserById(db: Db, id: string): Promise<PublicUser | null> {
  const row = await db.users.findOne({ _id: id }, { projection: { password_hash: 0 } })
  return row ? publicUser(row as UserDoc) : null
}

export async function getUserByEmail(db: Db, email: string): Promise<PublicUser | null> {
  const row = await db.users.findOne({ email }, { projection: { password_hash: 0 } })
  return row ? publicUser(row as UserDoc) : null
}

export async function authenticate(db: Db, email: string, password: string): Promise<PublicUser | null> {
  const normalized = email.trim().toLowerCase()
  const row = await db.users.findOne({ email: normalized })
  const ok = verifyPassword(password, row?.password_hash ?? dummyPasswordHash())
  if (!row || !ok) return null
  return publicUser(row)
}
