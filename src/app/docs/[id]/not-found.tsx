export default function DocumentNotFound() {
  return (
    <main id="main" className="gate">
      <p className="eyebrow">Folio</p>
      <h1>That document is not here</h1>
      <p>It may have been deleted, or the link is wrong.</p>
      <a className="btn" href="/docs">
        Back to documents
      </a>
    </main>
  )
}
