import { api } from '@/lib/api'
import { requireApiUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = api(async () => {
  const user = await requireApiUser()
  return Response.json({ user })
})
