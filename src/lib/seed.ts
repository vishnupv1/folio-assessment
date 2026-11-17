import { ALEX, ACCOUNTS, DEMO_PASSWORD, JORDAN, SAM } from './accounts'
import type { Db } from './db'
import { interviewDocument, planningDocument } from './demo-content'
import { createDocument, grantShare } from './documents'
import { hashPassword } from './passwords'

const DEMO_STAMP = '2026-11-16T15:04:00.000Z'
let demoHash: string | null = null

function passwordHash(): string {
  if (!demoHash) demoHash = hashPassword(DEMO_PASSWORD)
  return demoHash
}

function seedUsers(db: Db) {
  const insert = db.prepare(
    `INSERT INTO users (id, email, name, password_hash, created_at)
     VALUES (@id, @email, @name, @password_hash, @created_at)
     ON CONFLICT(id) DO NOTHING`,
  )
  for (const account of ACCOUNTS) {
    insert.run({
      id: account.id,
      email: account.email,
      name: account.name,
      password_hash: passwordHash(),
      created_at: '2026-11-16T15:00:00.000Z',
    })
  }
}

export function seedDatabase(db: Db, options?: { demoDocument?: boolean }) {
  seedUsers(db)
  if (options?.demoDocument === false) return
  const existing = db.prepare(`SELECT value FROM meta WHERE key = 'demo_seeded'`).get()
  if (existing) return

  const seed = db.transaction(() => {
    const planning = createDocument(db, ALEX.id, {
      title: 'Q3 planning',
      content: planningDocument(),
    })
    grantShare(db, planning.id, ALEX.id, { email: JORDAN.email, role: 'editor' })
    grantShare(db, planning.id, ALEX.id, { email: SAM.email, role: 'viewer' })
    const interview = createDocument(db, JORDAN.id, {
      title: 'Interview notes',
      content: interviewDocument(),
    })
    db.prepare(`UPDATE documents SET created_at = ?, updated_at = ? WHERE id IN (?, ?)`).run(
      DEMO_STAMP,
      DEMO_STAMP,
      planning.id,
      interview.id,
    )
    db.prepare(`INSERT INTO meta (key, value) VALUES ('demo_seeded', '1')`).run()
  })
  seed()
}
