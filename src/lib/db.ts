import { MongoClient, type Collection, type Db as MongoDatabase } from 'mongodb'
import type { ShareRole } from './types'

export type UserDoc = {
  _id: string
  email: string
  name: string
  password_hash: string
  created_at: string
}

export type DocumentDoc = {
  _id: string
  title: string
  content_json: string
  preview: string
  owner_id: string
  updated_by: string
  created_at: string
  updated_at: string
}

export type ShareDoc = {
  document_id: string
  user_id: string
  role: ShareRole
  created_at: string
}

export type MetaDoc = {
  _id: string
  value: string
}

export type Db = {
  client: MongoClient
  database: MongoDatabase
  users: Collection<UserDoc>
  documents: Collection<DocumentDoc>
  shares: Collection<ShareDoc>
  meta: Collection<MetaDoc>
  close: () => Promise<void>
}

export function databaseName(uri: string): string {
  const path = uri.split('?')[0]
  const name = path.slice(path.lastIndexOf('/') + 1)
  return name || 'folio'
}

export async function connect(uri: string, name = databaseName(uri)): Promise<Db> {
  const client = new MongoClient(uri)
  await client.connect()
  const database = client.db(name)
  const users = database.collection<UserDoc>('users')
  const documents = database.collection<DocumentDoc>('documents')
  const shares = database.collection<ShareDoc>('shares')
  const meta = database.collection<MetaDoc>('meta')
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    documents.createIndex({ owner_id: 1 }),
    shares.createIndex({ document_id: 1, user_id: 1 }, { unique: true }),
    shares.createIndex({ user_id: 1 }),
  ])
  return {
    client,
    database,
    users,
    documents,
    shares,
    meta,
    close: () => client.close(),
  }
}
