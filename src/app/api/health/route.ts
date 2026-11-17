import { api } from '@/lib/api'
import { getDb } from '@/lib/bootstrap'
import { HttpError } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  const count = await (await getDb()).users.countDocuments()
  if (count < 1) throw new HttpError(500, 'Database is not ready')
  return Response.json({ ok: true })
})
