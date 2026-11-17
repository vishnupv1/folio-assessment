import { LibraryScreen } from '@/components/LibraryScreen'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/bootstrap'
import { listForUser } from '@/lib/documents'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Documents · Folio' }

export default async function DocsPage() {
  const user = await requireUser()
  const data = listForUser(getDb(), user.id)
  return <LibraryScreen user={user} owned={data.owned} shared={data.shared} />
}
