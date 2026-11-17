import { api } from '@/lib/api'
import { requireApiUser } from '@/lib/auth'
import { getDb } from '@/lib/bootstrap'
import { HttpError } from '@/lib/errors'
import { importUploadedFile } from '@/lib/import-file'
import { MAX_UPLOAD_BYTES } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = api(async (req) => {
  const user = await requireApiUser()
  const form = await req.formData().catch(() => null)
  if (!form) throw new HttpError(400, 'Choose a file to import')
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError(400, 'Choose a file to import')
  if (file.size === 0) throw new HttpError(400, 'That file is empty')
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'That file is larger than 2 MB.')
  const bytes = Buffer.from(await file.arrayBuffer())
  const created = await importUploadedFile(getDb(), user.id, { name: file.name, bytes })
  return Response.json({ id: created.id }, { status: 201 })
})
