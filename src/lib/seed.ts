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

async function seedUsers(db: Db) {
  const hash = passwordHash()
  for (const account of ACCOUNTS) {
    await db.users.updateOne(
      { _id: account.id },
      {
        $setOnInsert: {
          email: account.email,
          name: account.name,
          password_hash: hash,
          created_at: '2026-11-16T15:00:00.000Z',
        },
      },
      { upsert: true },
    )
  }
}

export async function seedDatabase(db: Db, options?: { demoDocument?: boolean }) {
  await seedUsers(db)
  if (options?.demoDocument === false) return
  const existing = await db.meta.findOne({ _id: 'demo_seeded' })
  if (existing) return

  const planning = await createDocument(db, ALEX.id, {
    title: 'Q3 planning',
    content: planningDocument(),
  })
  await grantShare(db, planning.id, ALEX.id, { email: JORDAN.email, role: 'editor' })
  await grantShare(db, planning.id, ALEX.id, { email: SAM.email, role: 'viewer' })
  const interview = await createDocument(db, JORDAN.id, {
    title: 'Interview notes',
    content: interviewDocument(),
  })
  await db.documents.updateMany(
    { _id: { $in: [planning.id, interview.id] } },
    { $set: { created_at: DEMO_STAMP, updated_at: DEMO_STAMP } },
  )
  await db.meta.updateOne({ _id: 'demo_seeded' }, { $set: { value: '1' } }, { upsert: true })
}
