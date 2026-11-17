'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { avatarColor, initials } from '@/lib/text'
import type { Roster, ShareRole } from '@/lib/types'

export function ShareDialog({
  open,
  canManage,
  roster,
  pending,
  error,
  onClose,
  onGrant,
  onRevoke,
}: {
  open: boolean
  canManage: boolean
  roster: Roster
  pending: boolean
  error: string | null
  onClose: () => void
  onGrant: (email: string, role: ShareRole) => Promise<boolean>
  onRevoke: (userId: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('editor')

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    const ok = await onGrant(email, role)
    if (ok) setEmail('')
  }

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="share-title">Share</h2>
          <button type="button" className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="lede">
          {canManage
            ? 'Editors can change the text and the title. Viewers can read. Only you can share or delete.'
            : `Only ${roster.owner.name} can change who has access.`}
        </p>
        {canManage ? (
          <form className="share-form" onSubmit={(event) => void submit(event)}>
            <label>
              Email
              <input
                id="share-email"
                className="field"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jordan@ajaia.dev"
                required
              />
            </label>
            <label>
              Access
              <select className="field role-select" value={role} onChange={(event) => setRole(event.target.value as ShareRole)}>
                <option value="editor">Can edit</option>
                <option value="viewer">View only</option>
              </select>
            </label>
            <button className="btn" type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Share'}
            </button>
          </form>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <ul className="roster">
          <li className="roster-row">
            <span className="person">
              <span className="avatar" style={{ background: avatarColor(roster.owner.id) }}>
                {initials(roster.owner.name)}
              </span>
              <span>
                {roster.owner.name}
                <small>{roster.owner.email}</small>
              </span>
            </span>
            <span className="badge badge-owner">Owner</span>
          </li>
          {roster.shares.map((share) => (
            <li key={share.user.id} className="roster-row">
              <span className="person">
                <span className="avatar" style={{ background: avatarColor(share.user.id) }}>
                  {initials(share.user.name)}
                </span>
                <span>
                  {share.user.name}
                  <small>{share.user.email}</small>
                </span>
              </span>
              {canManage ? (
                <span className="actions">
                  <select
                    className="field role-select"
                    value={share.role}
                    disabled={pending}
                    aria-label={`Access for ${share.user.name}`}
                    onChange={(event) => void onGrant(share.user.email, event.target.value as ShareRole)}
                  >
                    <option value="editor">Can edit</option>
                    <option value="viewer">View only</option>
                  </select>
                  <button type="button" className="btn danger" disabled={pending} onClick={() => void onRevoke(share.user.id)}>
                    Remove
                  </button>
                </span>
              ) : (
                <span className={`badge ${share.role === 'editor' ? 'badge-editor' : 'badge-viewer'}`}>
                  {share.role === 'editor' ? 'Can edit' : 'View only'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
