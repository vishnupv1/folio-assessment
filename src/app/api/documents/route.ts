import { api } from '@/lib/api'
import { requireApiUser } from '@/lib/auth'
import { getDb } from '@/lib/bootstrap'
import { createDocument, listForUser } from '@/lib/documents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  const user = await requireApiUser()
  return Response.json(await listForUser(await getDb(), user.id))
})

export const POST = api(async () => {
  const user = await requireApiUser()
  const created = await createDocument(await getDb(), user.id)
  return Response.json({ id: created.id }, { status: 201 })
})
