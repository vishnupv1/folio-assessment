import { connect, databaseName, type Db } from './db'
import { seedDatabase } from './seed'

const globalForDb = globalThis as unknown as { folioDb?: Db; folioOpening?: Promise<Db> }

export async function openDatabase(options?: {
  demoDocument?: boolean
  uri?: string
  name?: string
}): Promise<Db> {
  const uri = options?.uri || process.env.MONGODB_URI
  if (!uri) throw new Error('Set MONGODB_URI')
  const db = await connect(uri, options?.name || databaseName(uri))
  await seedDatabase(db, options)
  return db
}

export function getDb(): Promise<Db> {
  if (globalForDb.folioDb) return Promise.resolve(globalForDb.folioDb)
  if (!globalForDb.folioOpening) {
    globalForDb.folioOpening = openDatabase()
      .then((db) => {
        globalForDb.folioDb = db
        return db
      })
      .catch((err) => {
        globalForDb.folioOpening = undefined
        throw err
      })
  }
  return globalForDb.folioOpening
}
