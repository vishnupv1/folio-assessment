import { api, readJson, routeId } from '@/lib/api'
import { requireApiUser } from '@/lib/auth'
import { getDb } from '@/lib/bootstrap'
import { deleteDocument, getAccessibleDocument, updateDocument } from '@/lib/documents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = api(async (_req, ctx) => {
  const user = await requireApiUser()
  const id = await routeId(ctx)
  return Response.json(getAccessibleDocument(getDb(), id, user.id))
})

export const PATCH = api(async (req, ctx) => {
  const user = await requireApiUser()
  const id = await routeId(ctx)
  const body = await readJson(req)
  const saved = updateDocument(getDb(), id, user.id, {
    title: body.title,
    content: body.content,
    baseUpdatedAt: body.baseUpdatedAt,
  })
  return Response.json(saved)
})

export const DELETE = api(async (_req, ctx) => {
  const user = await requireApiUser()
  const id = await routeId(ctx)
  deleteDocument(getDb(), id, user.id)
  return Response.json({ ok: true })
})
