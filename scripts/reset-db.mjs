import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Set MONGODB_URI before resetting the database.')
  process.exit(1)
}

const path = uri.split('?')[0]
const name = path.slice(path.lastIndexOf('/') + 1) || 'folio'
const client = new MongoClient(uri)
await client.connect()
await client.db(name).dropDatabase()
await client.close()
console.log('Removed the Folio MongoDB database. The next start recreates the demo accounts and sample documents.')
