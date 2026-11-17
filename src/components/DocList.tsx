import Link from 'next/link'
import type { OwnedListItem, SharedListItem } from '@/lib/types'

function DocIcon() {
  return (
    <svg className="doc-glyph" width="28" height="34" viewBox="0 0 28 34" aria-hidden="true">
      <path d="M4 2h12l8 8v20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fff" stroke="#e3d9cb" />
      <path d="M16 2v8h8" fill="#f3efe6" stroke="#e3d9cb" />
    </svg>
  )
}

function Row({
  href,
  title,
  preview,
  badge,
  badgeClass,
  meta,
}: {
  href: string
  title: string
  preview: string
  badge: string
  badgeClass: string
  meta: string
}) {
  return (
    <Link href={href} className="doc-row">
      <DocIcon />
      <span>
        <span className="doc-title">{title}</span>
        <span className="doc-preview">{preview || 'Empty document'}</span>
      </span>
      <span className="doc-meta">
        <span className={`badge ${badgeClass}`}>{badge}</span>
        <span>{meta}</span>
      </span>
    </Link>
  )
}

export function DocumentSections({ owned, shared }: { owned: OwnedListItem[]; shared: SharedListItem[] }) {
  return (
    <>
      <section className="section" aria-labelledby="owned-heading">
        <div className="section-head">
          <h2 id="owned-heading">
            Your documents <span className="count">{owned.length}</span>
          </h2>
        </div>
        {owned.length === 0 ? (
          <p className="empty">You have not created a document yet. Start one, or import a file.</p>
        ) : (
          <div className="doc-list">
            {owned.map((doc) => (
              <Row
                key={doc.id}
                href={`/docs/${doc.id}`}
                title={doc.title}
                preview={doc.preview}
                badge="Owner"
                badgeClass="badge-owner"
                meta={doc.updatedLabel}
              />
            ))}
          </div>
        )}
      </section>
      <section className="section" aria-labelledby="shared-heading">
        <div className="section-head">
          <h2 id="shared-heading">
            Shared with you <span className="count">{shared.length}</span>
          </h2>
        </div>
        {shared.length === 0 ? (
          <p className="empty">When someone shares a document with you, it will show up here.</p>
        ) : (
          <div className="doc-list">
            {shared.map((doc) => (
              <Row
                key={doc.id}
                href={`/docs/${doc.id}`}
                title={doc.title}
                preview={doc.preview}
                badge={doc.role === 'editor' ? 'Can edit' : 'View only'}
                badgeClass={doc.role === 'editor' ? 'badge-editor' : 'badge-viewer'}
                meta={`From ${doc.ownerName} · ${doc.updatedLabel}`}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
