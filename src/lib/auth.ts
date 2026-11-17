import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_NAME } from './constants'
import { getDb } from './bootstrap'
import { HttpError } from './errors'
import { readSession } from './session'
import type { PublicUser } from './types'
import { getUserById } from './users'

export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  const userId = readSession(token)
  if (!userId) return null
  return getUserById(getDb(), userId)
}

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireApiUser(): Promise<PublicUser> {
  const user = await getCurrentUser()
  if (!user) throw new HttpError(401, 'Sign in to continue')
  return user
}
