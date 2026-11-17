import { MongoMemoryServer } from 'mongodb-memory-server'
import { openDatabase } from '@/lib/bootstrap'
import type { Db } from '@/lib/db'

let server: MongoMemoryServer | undefined
let sequence = 0

async function uri(): Promise<string> {
  if (!server) server = await MongoMemoryServer.create()
  return server.getUri()
}

export async function testDatabase(demo = false): Promise<Db> {
  sequence += 1
  return openDatabase({ uri: await uri(), name: `folio_${sequence}`, demoDocument: demo })
}

export async function testUri(): Promise<string> {
  return uri()
}

export async function stopMemoryServer(): Promise<void> {
  await server?.stop()
  server = undefined
}
