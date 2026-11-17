import { EditorShell } from '@/components/EditorShell'
import { requireUser } from '@/lib/auth'
import { getDb } from '@/lib/bootstrap'
import { getAccessibleDocument } from '@/lib/documents'
import { isHttpError } from '@/lib/errors'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  try {
    const doc = await getAccessibleDocument(await getDb(), id, user.id)
    return <EditorShell key={doc.id} currentUser={user} doc={doc} />
  } catch (err) {
    if (isHttpError(err) && err.status === 403) {
      return (
        <main id="main" className="gate">
          <p className="eyebrow">Folio</p>
          <h1>You don&apos;t have access</h1>
          <p>Ask the owner to share this document with you.</p>
          <a className="btn" href="/docs">
            Back to documents
          </a>
        </main>
      )
    }
    if (isHttpError(err) && err.status === 404) notFound()
    throw err
  }
}
