import { rmSync } from 'node:fs'

for (const file of ['data/folio.db', 'data/folio.db-wal', 'data/folio.db-shm']) {
  rmSync(file, { force: true })
}

console.log('Removed the local Folio database. The next start will recreate the demo accounts and sample documents.')
