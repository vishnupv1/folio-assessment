import { randomUUID } from 'node:crypto'
import type { Db } from './db'
import { assertEditorDocument } from './editor-extensions'
import { HttpError } from './errors'
import { canDelete, canEdit, canManageSharing } from './permissions'
import { emptyDocument, formatUpdated, previewText } from './text'
import type {
  AccessRole,
  DocumentLists,
  EditorPayload,
  OwnedListItem,
  PMNode,
  PublicUser,
  Roster,
  SavedDocument,
  ShareRole,
  SharedListItem,
} from './types'
import { getUserByEmail, getUserById } from './users'
import { normalizeEmail, parseContent, parseRole, parseTitle } from './validators'

type DocumentRow = {
  id: string
  title: string
  content_json: string
  preview: string
  owner_id: string
  updated_by: string
  created_at: string
  updated_at: string
}

function requireDocument(db: Db, id: string): DocumentRow {
  const row = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined
  if (!row) throw new HttpError(404, 'Document not found')
  return row
}

function roleFor(db: Db, doc: DocumentRow, userId: string): AccessRole {
  if (doc.owner_id === userId) return 'owner'
  const share = db.prepare('SELECT role FROM shares WHERE document_id = ? AND user_id = ?').get(doc.id, userId) as
    | { role: ShareRole }
    | undefined
  if (!share) throw new HttpError(403, "You don't have access to this document")
  return share.role
}

function requireUser(db: Db, id: string): PublicUser {
  const user = getUserById(db, id)
  if (!user) throw new HttpError(500, 'This document could not be read')
  return user
}

function readContent(raw: string): PMNode {
  try {
    const value = JSON.parse(raw) as PMNode
    if (!value || value.type !== 'doc' || !Array.isArray(value.content)) throw new Error('bad document')
    return value
  } catch {
    throw new HttpError(500, 'This document could not be read')
  }
}

export function rosterFor(db: Db, doc: DocumentRow): Roster {
  const owner = requireUser(db, doc.owner_id)
  const rows = db
    .prepare(
      `SELECT u.id AS id, u.email AS email, u.name AS name, s.role AS role
       FROM shares s
       JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ?
       ORDER BY u.name COLLATE NOCASE`,
    )
    .all(doc.id) as { id: string; email: string; name: string; role: ShareRole }[]
  return {
    owner,
    shares: rows.map((row) => ({
      user: { id: row.id, email: row.email, name: row.name },
      role: row.role,
    })),
  }
}

function toPayload(db: Db, doc: DocumentRow, access: AccessRole): EditorPayload {
  return {
    id: doc.id,
    title: doc.title,
    content: readContent(doc.content_json),
    preview: doc.preview,
    updatedAt: doc.updated_at,
    updatedLabel: formatUpdated(doc.updated_at),
    access,
    owner: requireUser(db, doc.owner_id),
    updatedBy: requireUser(db, doc.updated_by),
    roster: rosterFor(db, doc),
  }
}

function listItem(row: { id: string; title: string; preview: string; updated_at: string }): OwnedListItem {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    updatedAt: row.updated_at,
    updatedLabel: formatUpdated(row.updated_at),
  }
}

export function listForUser(db: Db, userId: string): DocumentLists {
  const owned = db
    .prepare(
      `SELECT id, title, preview, updated_at
       FROM documents
       WHERE owner_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(userId) as { id: string; title: string; preview: string; updated_at: string }[]

  const shared = db
    .prepare(
      `SELECT d.id, d.title, d.preview, d.updated_at, s.role, u.name AS owner_name
       FROM shares s
       JOIN documents d ON d.id = s.document_id
       JOIN users u ON u.id = d.owner_id
       WHERE s.user_id = ?
       ORDER BY d.updated_at DESC`,
    )
    .all(userId) as {
    id: string
    title: string
    preview: string
    updated_at: string
    role: ShareRole
    owner_name: string
  }[]

  return {
    owned: owned.map(listItem),
    shared: shared.map(
      (row): SharedListItem => ({
        ...listItem(row),
        role: row.role,
        ownerName: row.owner_name,
      }),
    ),
  }
}

export function getAccessibleDocument(db: Db, documentId: string, userId: string): EditorPayload {
  const doc = requireDocument(db, documentId)
  const access = roleFor(db, doc, userId)
  return toPayload(db, doc, access)
}

export function createDocument(
  db: Db,
  ownerId: string,
  input?: { title?: string; content?: PMNode },
): { id: string } {
  if (!getUserById(db, ownerId)) throw new HttpError(401, 'Sign in to continue')
  const title = input?.title ? parseTitle(input.title) : 'Untitled document'
  const content = input?.content ? parseContent(input.content) : emptyDocument()
  try {
    assertEditorDocument(content)
  } catch (err) {
    console.error(err)
    throw new HttpError(400, 'Content must be a document the editor can open')
  }
  const now = new Date().toISOString()
  const id = `doc_${randomUUID()}`
  db.prepare(
    `INSERT INTO documents (id, title, content_json, preview, owner_id, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, title, JSON.stringify(content), previewText(content), ownerId, ownerId, now, now)
  return { id }
}

export function updateDocument(
  db: Db,
  documentId: string,
  actorId: string,
  input: { title: unknown; content: unknown; baseUpdatedAt?: unknown },
): SavedDocument {
  const doc = requireDocument(db, documentId)
  const access = roleFor(db, doc, actorId)
  if (!canEdit(access)) {
    throw new HttpError(403, "You have view access and can't edit this document.")
  }
  const title = parseTitle(input.title)
  const content = parseContent(input.content)
  try {
    assertEditorDocument(content)
  } catch (err) {
    console.error(err)
    throw new HttpError(400, 'Content must be a document the editor can open')
  }
  const contentJson = JSON.stringify(content)
  const updatedBy = requireUser(db, actorId)
  if (title === doc.title && contentJson === doc.content_json) {
    return {
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updated_at,
      updatedBy: requireUser(db, doc.updated_by),
      preview: doc.preview,
    }
  }
  if (typeof input.baseUpdatedAt !== 'string' || !input.baseUpdatedAt) {
    throw new HttpError(400, 'Include baseUpdatedAt so two people do not overwrite each other.')
  }
  if (input.baseUpdatedAt !== doc.updated_at) {
    throw new HttpError(409, 'Someone else saved this document. Reload to continue.')
  }
  const updatedAt = new Date().toISOString()
  const preview = previewText(content)
  db.prepare(
    `UPDATE documents
     SET title = ?, content_json = ?, preview = ?, updated_by = ?, updated_at = ?
     WHERE id = ?`,
  ).run(title, contentJson, preview, actorId, updatedAt, doc.id)
  return { id: doc.id, title, updatedAt, updatedBy, preview }
}

export function deleteDocument(db: Db, documentId: string, actorId: string): void {
  const doc = requireDocument(db, documentId)
  const access = roleFor(db, doc, actorId)
  if (!canDelete(access)) {
    throw new HttpError(
      403,
      access === 'viewer'
        ? "You have view access and can't delete this document."
        : 'Only the owner can delete this document.',
    )
  }
  db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id)
}

export function grantShare(
  db: Db,
  documentId: string,
  actorId: string,
  input: { email: unknown; role: unknown },
): Roster {
  const doc = requireDocument(db, documentId)
  const access = roleFor(db, doc, actorId)
  if (!canManageSharing(access)) {
    throw new HttpError(403, 'Only the owner can change sharing')
  }
  const email = normalizeEmail(input.email)
  const shareRole = parseRole(input.role)
  const target = getUserByEmail(db, email)
  if (!target) {
    throw new HttpError(
      404,
      'No Folio account uses that email. Try alex@ajaia.dev, jordan@ajaia.dev, or sam@ajaia.dev.',
    )
  }
  if (target.id === doc.owner_id) {
    throw new HttpError(400, `${target.name} already owns this document.`)
  }
  const existing = db
    .prepare('SELECT role FROM shares WHERE document_id = ? AND user_id = ?')
    .get(doc.id, target.id) as { role: ShareRole } | undefined
  if (!existing) {
    const count = db.prepare('SELECT COUNT(*) AS n FROM shares WHERE document_id = ?').get(doc.id) as { n: number }
    if (count.n >= 20) throw new HttpError(400, 'This document is already shared with 20 people')
  }
  db.prepare(
    `INSERT INTO shares (document_id, user_id, role, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(document_id, user_id) DO UPDATE SET role = excluded.role`,
  ).run(doc.id, target.id, shareRole, new Date().toISOString())
  return rosterFor(db, doc)
}

export function revokeShare(db: Db, documentId: string, actorId: string, targetUserId: string): Roster {
  const doc = requireDocument(db, documentId)
  const access = roleFor(db, doc, actorId)
  if (!canManageSharing(access)) {
    throw new HttpError(403, 'Only the owner can change sharing')
  }
  if (!targetUserId) throw new HttpError(400, 'Choose a person to remove')
  if (targetUserId === doc.owner_id) {
    throw new HttpError(400, "The owner's access can't be removed.")
  }
  const result = db.prepare('DELETE FROM shares WHERE document_id = ? AND user_id = ?').run(doc.id, targetUserId)
  if (result.changes === 0) throw new HttpError(404, 'That person does not have a share to remove')
  return rosterFor(db, doc)
}
