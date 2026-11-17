'use client'

import { useEditor, type Editor } from '@tiptap/react'
import { EditorContent } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { editorExtensions } from '@/lib/editor-extensions'
import { downloadName } from '@/lib/files'
import { documentToMarkdown } from '@/lib/markdown-export'
import { countWords, documentText, normalizeTitle } from '@/lib/text'
import type { EditorPayload, PMNode, PublicUser, Roster, ShareRole } from '@/lib/types'
import { ShareDialog } from './ShareDialog'
import { Toolbar } from './Toolbar'
import { TopBar } from './TopBar'

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict'

const LABELS: Record<SaveState, string> = {
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Not saved',
  conflict: 'Save paused',
}

export function EditorShell({ currentUser, doc }: { currentUser: PublicUser; doc: EditorPayload }) {
  const canEdit = doc.access === 'owner' || doc.access === 'editor'
  const [title, setTitle] = useState(doc.title)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [words, setWords] = useState(() => countWords(documentText(doc.content)))
  const [updatedLabel, setUpdatedLabel] = useState(doc.updatedLabel)
  const [updatedByName, setUpdatedByName] = useState(doc.updatedBy.name)
  const [roster, setRoster] = useState<Roster>(doc.roster)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [sharePending, setSharePending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const latest = useRef({ title: doc.title, content: doc.content as PMNode, updatedAt: doc.updatedAt })
  const saved = useRef({ title: doc.title, contentJson: JSON.stringify(doc.content), updatedAt: doc.updatedAt })
  const canWrite = useRef(canEdit)
  const conflictRef = useRef(false)
  const statusRef = useRef<SaveState>('saved')
  const saving = useRef(false)
  const queued = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorReady = useRef(false)
  const flushRef = useRef<(keepalive?: boolean) => Promise<void>>(async () => {})
  const onEditorUpdateRef = useRef<(editor: Editor, changed: boolean) => void>(() => {})

  canWrite.current = canEdit && !conflict
  conflictRef.current = conflict
  statusRef.current = status
  latest.current.title = title

  const editor = useEditor({
    extensions: editorExtensions(),
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'aria-label': 'Document body',
        class: 'prose',
      },
    },
    onCreate: ({ editor: created }) => {
      const json = created.getJSON() as PMNode
      latest.current.content = json
      saved.current.contentJson = JSON.stringify(json)
      setWords(countWords(created.getText()))
      editorReady.current = true
    },
    onUpdate: ({ editor: current, transaction }) => {
      onEditorUpdateRef.current(current, transaction.docChanged)
    },
  })

  useEffect(() => {
    editor?.setEditable(canEdit && !conflict)
  }, [editor, canEdit, conflict])

  useEffect(() => {
    document.title = `${title || 'Untitled'} · Folio`
  }, [title])

  function scheduleSave() {
    if (!canWrite.current || conflictRef.current) return
    setStatus('unsaved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void flushRef.current()
    }, 650)
  }

  onEditorUpdateRef.current = (current, changed) => {
    const json = current.getJSON() as PMNode
    latest.current.content = json
    setWords(countWords(current.getText()))
    if (!editorReady.current || !changed || !canWrite.current) return
    const normalized = normalizeTitle(latest.current.title)
    if (JSON.stringify(json) === saved.current.contentJson && normalized === saved.current.title) return
    scheduleSave()
  }

  flushRef.current = async (keepalive = false) => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (!canWrite.current || conflictRef.current) return
    if (saving.current) {
      queued.current = true
      return
    }
    const nextTitle = normalizeTitle(latest.current.title)
    if (!nextTitle) {
      setTitleError("Title can't be empty")
      setStatus('error')
      return
    }
    const content = latest.current.content
    const contentJson = JSON.stringify(content)
    if (nextTitle === saved.current.title && contentJson === saved.current.contentJson) {
      setStatus('saved')
      return
    }
    saving.current = true
    queued.current = false
    setStatus('saving')
    setSaveError(null)
    const body = JSON.stringify({
      title: nextTitle,
      content,
      baseUpdatedAt: latest.current.updatedAt,
    })
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: keepalive && body.length < 60_000,
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (res.status === 409) {
        conflictRef.current = true
        setConflict(true)
        setStatus('conflict')
        setSaveError(data.error || 'Someone else saved this document. Reload to continue.')
        return
      }
      if (!res.ok) {
        setSaveError(data.error || 'Could not save')
        setStatus('error')
        return
      }
      saved.current = { title: nextTitle, contentJson, updatedAt: data.updatedAt }
      latest.current.updatedAt = data.updatedAt
      setUpdatedLabel('Just now')
      setUpdatedByName(currentUser.name)
      setStatus('saved')
    } catch {
      setSaveError('Could not reach the server')
      setStatus('error')
    } finally {
      saving.current = false
      if (queued.current && !conflictRef.current) {
        queued.current = false
        void flushRef.current()
      }
    }
  }

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (statusRef.current === 'unsaved' || statusRef.current === 'saving') {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    function onHide() {
      if (document.visibilityState === 'hidden') void flushRef.current(true)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('visibilitychange', onHide)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function onGrant(email: string, role: ShareRole) {
    setSharePending(true)
    setShareError(null)
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json().catch(() => ({}))
    setSharePending(false)
    if (!res.ok) {
      setShareError(data.error || 'Could not share')
      return false
    }
    setRoster(data.roster)
    return true
  }

  async function onRevoke(userId: string) {
    setSharePending(true)
    setShareError(null)
    const res = await fetch(`/api/documents/${doc.id}/share?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    setSharePending(false)
    if (!res.ok) {
      setShareError(data.error || 'Could not update sharing')
      return
    }
    setRoster(data.roster)
  }

  function exportMarkdown() {
    const content = (editor?.getJSON() as PMNode | undefined) ?? latest.current.content
    const markdown = documentToMarkdown(content)
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadName(normalizeTitle(title) || 'document')
    link.click()
    URL.revokeObjectURL(url)
  }

  async function remove() {
    setDeletePending(true)
    setDeleteError(null)
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      window.location.href = '/login'
      return
    }
    if (!res.ok) {
      setDeleteError(data.error || 'Could not delete')
      setDeletePending(false)
      return
    }
    window.location.href = '/docs'
  }

  const showTools = canEdit && !conflict
  const accessLabel = doc.access === 'owner' ? 'Owner' : doc.access === 'editor' ? 'Can edit' : 'View only'

  return (
    <>
      <TopBar
        user={currentUser}
        center={
          <div className="actions">
            <span className="save-state" role="status" data-state={status}>
              {LABELS[status]}
            </span>
            {status === 'error' ? (
              <button type="button" className="btn secondary" onClick={() => void flushRef.current()}>
                Retry
              </button>
            ) : null}
            <button type="button" className="btn secondary" onClick={exportMarkdown}>
              Export .md
            </button>
            <button type="button" className="btn secondary" onClick={() => setShareOpen(true)}>
              Share
            </button>
            {doc.access === 'owner' ? (
              <button type="button" className="btn danger" onClick={() => setDeleteOpen(true)}>
                Delete
              </button>
            ) : null}
          </div>
        }
      />
      {doc.access === 'viewer' ? (
        <div className="banner banner-info">
          <p>View only. You can read this document. Ask {doc.owner.name} if you need to edit.</p>
        </div>
      ) : null}
      {conflict ? (
        <div className="banner banner-warn">
          <p>{saveError}</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload document
          </button>
        </div>
      ) : null}
      <main id="main" className="editor-page">
        <div className="workspace">
          <article className="sheet">
            <div className="title-row">
              {canEdit && !conflict ? (
                <input
                  className="title-input"
                  aria-label="Document title"
                  value={title}
                  maxLength={180}
                  onChange={(event) => {
                    const value = event.target.value
                    setTitle(value)
                    latest.current.title = value
                    if (!normalizeTitle(value)) {
                      setTitleError("Title can't be empty")
                      return
                    }
                    setTitleError(null)
                    scheduleSave()
                  }}
                />
              ) : (
                <h1 className="title-input">{title}</h1>
              )}
              <span className={`badge badge-${doc.access}`}>{accessLabel}</span>
            </div>
            {titleError ? <p className="form-error">{titleError}</p> : null}
            {showTools ? <Toolbar editor={editor} /> : null}
            <EditorContent editor={editor} />
            <footer className="sheet-foot">
              <span>
                {words} {words === 1 ? 'word' : 'words'}
              </span>
              <span>
                Last edit by {updatedByName} · {updatedLabel}
              </span>
              {canEdit ? <span>If two people edit at once, the last save wins and the other person reloads.</span> : null}
            </footer>
            {saveError && !conflict ? (
              <p className="form-error" role="alert">
                {saveError}
              </p>
            ) : null}
          </article>
        </div>
      </main>
      <ShareDialog
        open={shareOpen}
        canManage={doc.access === 'owner'}
        roster={roster}
        pending={sharePending}
        error={shareError}
        onClose={() => setShareOpen(false)}
        onGrant={onGrant}
        onRevoke={onRevoke}
      />
      {deleteOpen ? (
        <div className="backdrop" onMouseDown={() => setDeleteOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-title">Delete this document?</h2>
            <p>This removes it for you and for everyone it is shared with.</p>
            {deleteError ? <p className="form-error">{deleteError}</p> : null}
            <div className="actions">
              <button type="button" className="btn secondary" onClick={() => setDeleteOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn danger" disabled={deletePending} onClick={() => void remove()}>
                {deletePending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
