import path from 'node:path'
import { connect, type Db } from './db'
import { seedDatabase } from './seed'

const globalForDb = globalThis as unknown as { folioDb?: Db }

export function openDatabase(filename: string, options?: { demoDocument?: boolean }): Db {
  const db = connect(filename)
  seedDatabase(db, options)
  return db
}

export function getDb(): Db {
  if (!globalForDb.folioDb) {
    const filename = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'folio.db')
    globalForDb.folioDb = openDatabase(filename)
  }
  return globalForDb.folioDb
}
