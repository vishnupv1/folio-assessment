'use client'

import { useRef, useState } from 'react'
import { MAX_UPLOAD_BYTES } from '@/lib/constants'
import { importExtension } from '@/lib/files'
import type { OwnedListItem, PublicUser, SharedListItem } from '@/lib/types'
import { DocumentSections } from './DocList'
import { TopBar } from './TopBar'

export function LibraryScreen({
  user,
  owned,
  shared,
}: {
  user: PublicUser
  owned: OwnedListItem[]
  shared: SharedListItem[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<'new' | 'import' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function createDocument() {
    setPending('new')
    setError(null)
    const res = await fetch('/api/documents', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      window.location.href = '/login'
      return
    }
    if (!res.ok || !data.id) {
      setError(data.error || 'Could not create a document')
      setPending(null)
      return
    }
    window.location.href = `/docs/${data.id}`
  }

  async function upload(file: File) {
    if (!importExtension(file.name)) {
      setError('Import a .txt, .md, or .docx file.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That file is larger than 2 MB.')
      return
    }
    setPending('import')
    setError(null)
    const body = new FormData()
    body.set('file', file)
    const res = await fetch('/api/documents/import', { method: 'POST', body })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      window.location.href = '/login'
      return
    }
    if (!res.ok || !data.id) {
      setError(data.error || 'Could not import that file')
      setPending(null)
      return
    }
    window.location.href = `/docs/${data.id}`
  }

  return (
    <>
      <TopBar user={user} />
      <main
        id="main"
        className={dragOver ? 'library is-drag' : 'library'}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return
          setDragOver(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          const files = event.dataTransfer.files
          if (!files?.length) return
          if (files.length > 1) {
            setError('Drop one file at a time.')
            return
          }
          const file = files[0]
          if (file) void upload(file)
        }}
      >
        <div className="page">
          <div className="page-head">
            <div>
              <p className="eyebrow">Library</p>
              <h1>Documents</h1>
              <p className="lede">
                Owned documents stay with you. Shared documents show the access you were given.
              </p>
            </div>
            <div className="actions">
              <button type="button" className="btn" disabled={pending !== null} onClick={() => void createDocument()}>
                {pending === 'new' ? 'Creating…' : 'New document'}
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={pending !== null}
                onClick={() => inputRef.current?.click()}
              >
                {pending === 'import' ? 'Importing…' : 'Import'}
              </button>
              <input
                ref={inputRef}
                type="file"
                hidden
                accept=".txt,.md,.markdown,.docx,text/plain,text/markdown"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void upload(file)
                }}
              />
            </div>
          </div>
          <p className="file-note">TXT, Markdown, or Word (.docx), up to 2 MB. Images in Word files are dropped.</p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <DocumentSections owned={owned} shared={shared} />
        </div>
      </main>
    </>
  )
}
