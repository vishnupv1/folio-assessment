import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ALEX, DEMO_PASSWORD, JORDAN, SAM } from '@/lib/accounts'
import { openDatabase } from '@/lib/bootstrap'
import type { Db } from '@/lib/db'
import {
  createDocument,
  deleteDocument,
  getAccessibleDocument,
  grantShare,
  listForUser,
  revokeShare,
  updateDocument,
} from '@/lib/documents'
import { HttpError, isHttpError } from '@/lib/errors'
import { canDelete, canEdit, canManageSharing, canRename } from '@/lib/permissions'
import { emptyDocument } from '@/lib/text'
import { authenticate, getUserByEmail } from '@/lib/users'

const open: Db[] = []

function db(demo = false) {
  const database = openDatabase(':memory:', { demoDocument: demo })
  open.push(database)
  return database
}

afterEach(() => {
  for (const database of open) database.close()
  open.length = 0
})

function expectHttp(fn: () => unknown, status: number) {
  try {
    fn()
  } catch (err) {
    expect(isHttpError(err)).toBe(true)
    if (isHttpError(err)) expect(err.status).toBe(status)
    return
  }
  throw new Error(`Expected HTTP ${status}`)
}

describe('access policy', () => {
  it('lets editors change a document and reserves sharing and deletion for the owner', () => {
    expect(canEdit('owner')).toBe(true)
    expect(canEdit('editor')).toBe(true)
    expect(canEdit('viewer')).toBe(false)
    expect(canRename('editor')).toBe(true)
    expect(canRename('viewer')).toBe(false)
    expect(canManageSharing('owner')).toBe(true)
    expect(canManageSharing('editor')).toBe(false)
    expect(canDelete('owner')).toBe(true)
    expect(canDelete('editor')).toBe(false)
    expect(canDelete('viewer')).toBe(false)
  })
})

describe('documents and sharing', () => {
  it('seeds an owned note, an editable share, and a view-only share', () => {
    const database = db(true)
    const alex = getUserByEmail(database, ALEX.email)!
    const jordan = getUserByEmail(database, JORDAN.email)!
    const sam = getUserByEmail(database, SAM.email)!

    const alexDocs = listForUser(database, alex.id)
    expect(alexDocs.owned.map((doc) => doc.title)).toContain('Q3 planning')
    expect(alexDocs.shared).toHaveLength(0)

    const jordanDocs = listForUser(database, jordan.id)
    expect(jordanDocs.owned.map((doc) => doc.title)).toContain('Interview notes')
    expect(jordanDocs.shared.find((doc) => doc.title === 'Q3 planning')?.role).toBe('editor')

    const samDocs = listForUser(database, sam.id)
    expect(samDocs.owned).toHaveLength(0)
    expect(samDocs.shared.find((doc) => doc.title === 'Q3 planning')?.role).toBe('viewer')

    const shared = jordanDocs.shared.find((doc) => doc.title === 'Q3 planning')!
    const loaded = getAccessibleDocument(database, shared.id, jordan.id)
    expect(loaded.access).toBe('editor')
    expect(loaded.updatedAt).toBe('2026-11-16T15:04:00.000Z')
    expect(JSON.stringify(loaded.content)).toContain('bulletList')
    expect(JSON.stringify(loaded.content)).toContain('underline')

    const interview = jordanDocs.owned.find((doc) => doc.title === 'Interview notes')!
    expectHttp(() => getAccessibleDocument(database, interview.id, sam.id), 403)
  })

  it('enforces edit, share, delete, and stale-save rules', () => {
    const database = db()
    const alex = getUserByEmail(database, ALEX.email)!
    const jordan = getUserByEmail(database, JORDAN.email)!
    const sam = getUserByEmail(database, SAM.email)!
    const created = createDocument(database, alex.id, { title: 'Draft', content: emptyDocument() })
    const original = getAccessibleDocument(database, created.id, alex.id)

    expectHttp(() => getAccessibleDocument(database, created.id, jordan.id), 403)
    grantShare(database, created.id, alex.id, { email: JORDAN.email, role: 'viewer' })
    grantShare(database, created.id, alex.id, { email: SAM.email, role: 'viewer' })

    expectHttp(
      () =>
        updateDocument(database, created.id, sam.id, {
          title: 'Hijack',
          content: original.content,
          baseUpdatedAt: original.updatedAt,
        }),
      403,
    )
    expectHttp(() => grantShare(database, created.id, jordan.id, { email: SAM.email, role: 'editor' }), 403)
    expectHttp(() => deleteDocument(database, created.id, jordan.id), 403)

    grantShare(database, created.id, alex.id, { email: JORDAN.email, role: 'editor' })
    const jordanView = getAccessibleDocument(database, created.id, jordan.id)
    expect(jordanView.access).toBe('editor')
    expect(jordanView.roster.shares.find((share) => share.user.email === JORDAN.email)?.role).toBe('editor')

    const saved = updateDocument(database, created.id, jordan.id, {
      title: 'Draft revised',
      content: original.content,
      baseUpdatedAt: original.updatedAt,
    })
    expect(saved.title).toBe('Draft revised')
    expect(saved.updatedBy.name).toBe(JORDAN.name)

    expectHttp(
      () =>
        updateDocument(database, created.id, alex.id, {
          title: 'Too late',
          content: original.content,
          baseUpdatedAt: original.updatedAt,
        }),
      409,
    )

    const current = getAccessibleDocument(database, created.id, alex.id)
    const unchanged = updateDocument(database, created.id, alex.id, {
      title: current.title,
      content: current.content,
      baseUpdatedAt: 'not-the-current-stamp',
    })
    expect(unchanged.updatedAt).toBe(current.updatedAt)

    expectHttp(() => grantShare(database, created.id, alex.id, { email: ALEX.email, role: 'editor' }), 400)
    expectHttp(() => grantShare(database, created.id, alex.id, { email: 'nobody@ajaia.dev', role: 'viewer' }), 404)

    revokeShare(database, created.id, alex.id, sam.id)
    expectHttp(() => getAccessibleDocument(database, created.id, sam.id), 403)

    deleteDocument(database, created.id, alex.id)
    expectHttp(() => getAccessibleDocument(database, created.id, alex.id), 404)
  })

  it('keeps a share after the database is reopened', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'folio-'))
    const file = path.join(dir, 'folio.db')
    try {
      const first = openDatabase(file, { demoDocument: false })
      const alex = getUserByEmail(first, ALEX.email)!
      const jordan = getUserByEmail(first, JORDAN.email)!
      const created = createDocument(first, alex.id, { title: 'Persist me', content: emptyDocument() })
      grantShare(first, created.id, alex.id, { email: jordan.email, role: 'viewer' })
      first.close()

      const second = openDatabase(file, { demoDocument: false })
      const loaded = getAccessibleDocument(second, created.id, jordan.id)
      expect(loaded.access).toBe('viewer')
      expect(loaded.title).toBe('Persist me')
      second.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('demo login', () => {
  it('accepts the shared demo password and rejects a wrong one', () => {
    const database = db(true)
    expect(authenticate(database, ALEX.email, DEMO_PASSWORD)?.name).toBe(ALEX.name)
    expect(authenticate(database, 'Alex@Ajaia.dev', DEMO_PASSWORD)?.id).toBe(ALEX.id)
    expect(authenticate(database, ALEX.email, 'wrong-password')).toBeNull()
    expect(authenticate(database, 'nobody@ajaia.dev', DEMO_PASSWORD)).toBeNull()
  })
})

describe('rejected saves', () => {
  it('rejects an empty title', () => {
    const database = db()
    const alex = getUserByEmail(database, ALEX.email)!
    const created = createDocument(database, alex.id)
    const doc = getAccessibleDocument(database, created.id, alex.id)
    expect(() =>
      updateDocument(database, created.id, alex.id, {
        title: '   ',
        content: doc.content,
        baseUpdatedAt: doc.updatedAt,
      }),
    ).toThrow(HttpError)
  })
})
