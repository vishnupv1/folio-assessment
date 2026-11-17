import { afterAll, afterEach, describe, expect, it } from 'vitest'
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
import { stopMemoryServer, testDatabase, testUri } from './memory'

const open: Db[] = []

async function db(demo = false) {
  const database = await testDatabase(demo)
  open.push(database)
  return database
}

afterEach(async () => {
  for (const database of open) await database.close()
  open.length = 0
})

afterAll(async () => {
  await stopMemoryServer()
})

async function expectHttp(fn: () => Promise<unknown>, status: number) {
  try {
    await fn()
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
  it('seeds an owned note, an editable share, and a view-only share', async () => {
    const database = await db(true)
    const alex = (await getUserByEmail(database, ALEX.email))!
    const jordan = (await getUserByEmail(database, JORDAN.email))!
    const sam = (await getUserByEmail(database, SAM.email))!

    const alexDocs = await listForUser(database, alex.id)
    expect(alexDocs.owned.map((doc) => doc.title)).toContain('Q3 planning')
    expect(alexDocs.shared).toHaveLength(0)

    const jordanDocs = await listForUser(database, jordan.id)
    expect(jordanDocs.owned.map((doc) => doc.title)).toContain('Interview notes')
    expect(jordanDocs.shared.find((doc) => doc.title === 'Q3 planning')?.role).toBe('editor')

    const samDocs = await listForUser(database, sam.id)
    expect(samDocs.owned).toHaveLength(0)
    expect(samDocs.shared.find((doc) => doc.title === 'Q3 planning')?.role).toBe('viewer')

    const shared = jordanDocs.shared.find((doc) => doc.title === 'Q3 planning')!
    const loaded = await getAccessibleDocument(database, shared.id, jordan.id)
    expect(loaded.access).toBe('editor')
    expect(loaded.updatedAt).toBe('2026-11-16T15:04:00.000Z')
    expect(JSON.stringify(loaded.content)).toContain('bulletList')
    expect(JSON.stringify(loaded.content)).toContain('underline')

    const interview = jordanDocs.owned.find((doc) => doc.title === 'Interview notes')!
    await expectHttp(() => getAccessibleDocument(database, interview.id, sam.id), 403)
  })

  it('enforces edit, share, delete, and stale-save rules', async () => {
    const database = await db()
    const alex = (await getUserByEmail(database, ALEX.email))!
    const jordan = (await getUserByEmail(database, JORDAN.email))!
    const sam = (await getUserByEmail(database, SAM.email))!
    const created = await createDocument(database, alex.id, { title: 'Draft', content: emptyDocument() })
    const original = await getAccessibleDocument(database, created.id, alex.id)

    await expectHttp(() => getAccessibleDocument(database, created.id, jordan.id), 403)
    await grantShare(database, created.id, alex.id, { email: JORDAN.email, role: 'viewer' })
    await grantShare(database, created.id, alex.id, { email: SAM.email, role: 'viewer' })

    await expectHttp(
      () =>
        updateDocument(database, created.id, sam.id, {
          title: 'Hijack',
          content: original.content,
          baseUpdatedAt: original.updatedAt,
        }),
      403,
    )
    await expectHttp(() => grantShare(database, created.id, jordan.id, { email: SAM.email, role: 'editor' }), 403)
    await expectHttp(() => deleteDocument(database, created.id, jordan.id), 403)

    await grantShare(database, created.id, alex.id, { email: JORDAN.email, role: 'editor' })
    const jordanView = await getAccessibleDocument(database, created.id, jordan.id)
    expect(jordanView.access).toBe('editor')
    expect(jordanView.roster.shares.find((share) => share.user.email === JORDAN.email)?.role).toBe('editor')

    const saved = await updateDocument(database, created.id, jordan.id, {
      title: 'Draft revised',
      content: original.content,
      baseUpdatedAt: original.updatedAt,
    })
    expect(saved.title).toBe('Draft revised')
    expect(saved.updatedBy.name).toBe(JORDAN.name)

    await expectHttp(
      () =>
        updateDocument(database, created.id, alex.id, {
          title: 'Too late',
          content: original.content,
          baseUpdatedAt: original.updatedAt,
        }),
      409,
    )

    const current = await getAccessibleDocument(database, created.id, alex.id)
    const unchanged = await updateDocument(database, created.id, alex.id, {
      title: current.title,
      content: current.content,
      baseUpdatedAt: 'not-the-current-stamp',
    })
    expect(unchanged.updatedAt).toBe(current.updatedAt)

    await expectHttp(() => grantShare(database, created.id, alex.id, { email: ALEX.email, role: 'editor' }), 400)
    await expectHttp(() => grantShare(database, created.id, alex.id, { email: 'nobody@ajaia.dev', role: 'viewer' }), 404)

    await revokeShare(database, created.id, alex.id, sam.id)
    await expectHttp(() => getAccessibleDocument(database, created.id, sam.id), 403)

    await deleteDocument(database, created.id, alex.id)
    await expectHttp(() => getAccessibleDocument(database, created.id, alex.id), 404)
  })

  it('keeps a share after the database is reopened', async () => {
    const uri = await testUri()
    const name = `folio_reopen_${Date.now()}`
    const first = await openDatabase({ uri, name, demoDocument: false })
    const alex = (await getUserByEmail(first, ALEX.email))!
    const jordan = (await getUserByEmail(first, JORDAN.email))!
    const created = await createDocument(first, alex.id, { title: 'Persist me', content: emptyDocument() })
    await grantShare(first, created.id, alex.id, { email: jordan.email, role: 'viewer' })
    await first.close()

    const second = await openDatabase({ uri, name, demoDocument: false })
    const loaded = await getAccessibleDocument(second, created.id, jordan.id)
    expect(loaded.access).toBe('viewer')
    expect(loaded.title).toBe('Persist me')
    await second.close()
  })
})

describe('demo login', () => {
  it('accepts the shared demo password and rejects a wrong one', async () => {
    const database = await db(true)
    expect((await authenticate(database, ALEX.email, DEMO_PASSWORD))?.name).toBe(ALEX.name)
    expect((await authenticate(database, 'Alex@Ajaia.dev', DEMO_PASSWORD))?.id).toBe(ALEX.id)
    expect(await authenticate(database, ALEX.email, 'wrong-password')).toBeNull()
    expect(await authenticate(database, 'nobody@ajaia.dev', DEMO_PASSWORD)).toBeNull()
  })
})

describe('rejected saves', () => {
  it('rejects an empty title', async () => {
    const database = await db()
    const alex = (await getUserByEmail(database, ALEX.email))!
    const created = await createDocument(database, alex.id)
    const doc = await getAccessibleDocument(database, created.id, alex.id)
    await expect(
      updateDocument(database, created.id, alex.id, {
        title: '   ',
        content: doc.content,
        baseUpdatedAt: doc.updatedAt,
      }),
    ).rejects.toThrow(HttpError)
  })
})
