import { randomUUID } from 'node:crypto'
import type { Db, DocumentDoc } from './db'
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

function requireUser(user: PublicUser | null): PublicUser {
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

async function requireDocument(db: Db, id: string): Promise<DocumentDoc> {
  const row = await db.documents.findOne({ _id: id })
  if (!row) throw new HttpError(404, 'Document not found')
  return row
}

async function roleFor(db: Db, doc: DocumentDoc, userId: string): Promise<AccessRole> {
  if (doc.owner_id === userId) return 'owner'
  const share = await db.shares.findOne({ document_id: doc._id, user_id: userId })
  if (!share) throw new HttpError(403, "You don't have access to this document")
  return share.role
}

export async function rosterFor(db: Db, doc: DocumentDoc): Promise<Roster> {
  const owner = requireUser(await getUserById(db, doc.owner_id))
  const shareRows = await db.shares.find({ document_id: doc._id }).toArray()
  const people = await db.users.find({ _id: { $in: shareRows.map((share) => share.user_id) } }).toArray()
  const byId = new Map(people.map((person) => [person._id, person]))
  const shares = shareRows
    .flatMap((share) => {
      const person = byId.get(share.user_id)
      if (!person) return []
      return [{ user: { id: person._id, email: person.email, name: person.name }, role: share.role }]
    })
    .sort((a, b) => a.user.name.localeCompare(b.user.name, undefined, { sensitivity: 'base' }))
  return { owner, shares }
}

async function toPayload(db: Db, doc: DocumentDoc, access: AccessRole): Promise<EditorPayload> {
  return {
    id: doc._id,
    title: doc.title,
    content: readContent(doc.content_json),
    preview: doc.preview,
    updatedAt: doc.updated_at,
    updatedLabel: formatUpdated(doc.updated_at),
    access,
    owner: requireUser(await getUserById(db, doc.owner_id)),
    updatedBy: requireUser(await getUserById(db, doc.updated_by)),
    roster: await rosterFor(db, doc),
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

export async function listForUser(db: Db, userId: string): Promise<DocumentLists> {
  const owned = await db.documents.find({ owner_id: userId }).sort({ updated_at: -1 }).toArray()
  const shareRows = await db.shares.find({ user_id: userId }).toArray()
  const sharedDocs = await db.documents.find({ _id: { $in: shareRows.map((share) => share.document_id) } }).toArray()
  const owners = await db.users.find({ _id: { $in: sharedDocs.map((doc) => doc.owner_id) } }).toArray()
  const roleByDoc = new Map(shareRows.map((share) => [share.document_id, share.role]))
  const ownerById = new Map(owners.map((owner) => [owner._id, owner.name]))
  const shared = sharedDocs
    .map((doc) => ({
      id: doc._id,
      title: doc.title,
      preview: doc.preview,
      updated_at: doc.updated_at,
      role: roleByDoc.get(doc._id) ?? 'viewer',
      owner_name: ownerById.get(doc.owner_id) ?? 'Unknown',
    }))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))

  return {
    owned: owned.map((doc) =>
      listItem({ id: doc._id, title: doc.title, preview: doc.preview, updated_at: doc.updated_at }),
    ),
    shared: shared.map(
      (row): SharedListItem => ({
        ...listItem(row),
        role: row.role as ShareRole,
        ownerName: row.owner_name,
      }),
    ),
  }
}

export async function getAccessibleDocument(db: Db, documentId: string, userId: string): Promise<EditorPayload> {
  const doc = await requireDocument(db, documentId)
  const access = await roleFor(db, doc, userId)
  return toPayload(db, doc, access)
}

export async function createDocument(
  db: Db,
  ownerId: string,
  input?: { title?: string; content?: PMNode },
): Promise<{ id: string }> {
  if (!(await getUserById(db, ownerId))) throw new HttpError(401, 'Sign in to continue')
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
  await db.documents.insertOne({
    _id: id,
    title,
    content_json: JSON.stringify(content),
    preview: previewText(content),
    owner_id: ownerId,
    updated_by: ownerId,
    created_at: now,
    updated_at: now,
  })
  return { id }
}

export async function updateDocument(
  db: Db,
  documentId: string,
  actorId: string,
  input: { title: unknown; content: unknown; baseUpdatedAt?: unknown },
): Promise<SavedDocument> {
  const doc = await requireDocument(db, documentId)
  const access = await roleFor(db, doc, actorId)
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
  const updatedBy = requireUser(await getUserById(db, actorId))
  if (title === doc.title && contentJson === doc.content_json) {
    return {
      id: doc._id,
      title: doc.title,
      updatedAt: doc.updated_at,
      updatedBy: requireUser(await getUserById(db, doc.updated_by)),
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
  const result = await db.documents.updateOne(
    { _id: doc._id, updated_at: doc.updated_at },
    { $set: { title, content_json: contentJson, preview, updated_by: actorId, updated_at: updatedAt } },
  )
  if (result.matchedCount === 0) {
    throw new HttpError(409, 'Someone else saved this document. Reload to continue.')
  }
  return { id: doc._id, title, updatedAt, updatedBy, preview }
}

export async function deleteDocument(db: Db, documentId: string, actorId: string): Promise<void> {
  const doc = await requireDocument(db, documentId)
  const access = await roleFor(db, doc, actorId)
  if (!canDelete(access)) {
    throw new HttpError(
      403,
      access === 'viewer'
        ? "You have view access and can't delete this document."
        : 'Only the owner can delete this document.',
    )
  }
  await db.shares.deleteMany({ document_id: doc._id })
  await db.documents.deleteOne({ _id: doc._id })
}

export async function grantShare(
  db: Db,
  documentId: string,
  actorId: string,
  input: { email: unknown; role: unknown },
): Promise<Roster> {
  const doc = await requireDocument(db, documentId)
  const access = await roleFor(db, doc, actorId)
  if (!canManageSharing(access)) {
    throw new HttpError(403, 'Only the owner can change sharing')
  }
  const email = normalizeEmail(input.email)
  const shareRole = parseRole(input.role)
  const target = await getUserByEmail(db, email)
  if (!target) {
    throw new HttpError(
      404,
      'No Folio account uses that email. Try alex@ajaia.dev, jordan@ajaia.dev, or sam@ajaia.dev.',
    )
  }
  if (target.id === doc.owner_id) {
    throw new HttpError(400, `${target.name} already owns this document.`)
  }
  const existing = await db.shares.findOne({ document_id: doc._id, user_id: target.id })
  if (!existing) {
    const count = await db.shares.countDocuments({ document_id: doc._id })
    if (count >= 20) throw new HttpError(400, 'This document is already shared with 20 people')
  }
  await db.shares.updateOne(
    { document_id: doc._id, user_id: target.id },
    { $set: { role: shareRole }, $setOnInsert: { created_at: new Date().toISOString() } },
    { upsert: true },
  )
  return rosterFor(db, doc)
}

export async function revokeShare(db: Db, documentId: string, actorId: string, targetUserId: string): Promise<Roster> {
  const doc = await requireDocument(db, documentId)
  const access = await roleFor(db, doc, actorId)
  if (!canManageSharing(access)) {
    throw new HttpError(403, 'Only the owner can change sharing')
  }
  if (!targetUserId) throw new HttpError(400, 'Choose a person to remove')
  if (targetUserId === doc.owner_id) {
    throw new HttpError(400, "The owner's access can't be removed.")
  }
  const result = await db.shares.deleteOne({ document_id: doc._id, user_id: targetUserId })
  if (result.deletedCount === 0) throw new HttpError(404, 'That person does not have a share to remove')
  return rosterFor(db, doc)
}
