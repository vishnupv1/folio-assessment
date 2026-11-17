'use client'

export default function DocsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="gate">
      <p className="eyebrow">Folio</p>
      <h1>Could not open documents</h1>
      <p>Something went wrong while loading this page.</p>
      <button className="btn" type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  )
}
