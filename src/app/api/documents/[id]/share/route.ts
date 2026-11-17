import { api, readJson, routeId } from '@/lib/api'
import { requireApiUser } from '@/lib/auth'
import { getDb } from '@/lib/bootstrap'
import { grantShare, revokeShare } from '@/lib/documents'
import { HttpError } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = api(async (req, ctx) => {
  const user = await requireApiUser()
  const id = await routeId(ctx)
  const body = await readJson(req)
  const roster = grantShare(getDb(), id, user.id, { email: body.email, role: body.role })
  return Response.json({ roster })
})

export const DELETE = api(async (req, ctx) => {
  const user = await requireApiUser()
  const id = await routeId(ctx)
  const userId = new URL(req.url).searchParams.get('userId')
  if (!userId) throw new HttpError(400, 'Choose a person to remove')
  const roster = revokeShare(getDb(), id, user.id, userId)
  return Response.json({ roster })
})
