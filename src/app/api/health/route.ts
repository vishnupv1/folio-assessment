import { api } from '@/lib/api'
import { getDb } from '@/lib/bootstrap'
import { HttpError } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number } | undefined
  if (!row || row.n < 1) throw new HttpError(500, 'Database is not ready')
  return Response.json({ ok: true })
})
